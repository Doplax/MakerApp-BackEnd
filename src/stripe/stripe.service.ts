import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);
  private readonly feePercent: number;

  constructor(private readonly config: ConfigService) {
    this.stripe = new Stripe(config.getOrThrow<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2025-03-31.basil',
    });
    this.feePercent = Number(config.get('STRIPE_PLATFORM_FEE_PERCENT') ?? 5);
  }

  // ── Connect: onboarding ──────────────────────────────────────

  async createConnectAccount(email: string): Promise<string> {
    const account = await this.stripe.accounts.create({
      type: 'express',
      email,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    });
    return account.id;
  }

  async createAccountLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string> {
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    return link.url;
  }

  async getAccountStatus(accountId: string): Promise<{
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  }> {
    const account = await this.stripe.accounts.retrieve(accountId);
    return {
      detailsSubmitted: account.details_submitted,
      chargesEnabled:   account.charges_enabled,
      payoutsEnabled:   account.payouts_enabled,
    };
  }

  // ── Payments ─────────────────────────────────────────────────

  async createPaymentIntent(
    amount: number,
    currency: string,
    makerStripeAccountId: string,
    metadata: Record<string, string> = {},
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    if (!makerStripeAccountId) {
      throw new BadRequestException('El maker no tiene cuenta de Stripe configurada');
    }

    const fee = Math.round(amount * this.feePercent / 100);

    const pi = await this.stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      application_fee_amount: fee,
      transfer_data: { destination: makerStripeAccountId },
      metadata,
    });

    return { clientSecret: pi.client_secret!, paymentIntentId: pi.id };
  }

  // ── Webhook ──────────────────────────────────────────────────

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const secret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }

  handleWebhookEvent(event: Stripe.Event): void {
    switch (event.type) {
      case 'payment_intent.succeeded':
        this.logger.log(`PaymentIntent succeeded: ${(event.data.object as Stripe.PaymentIntent).id}`);
        // TODO: marcar proyecto como pagado en base de datos
        break;
      case 'payment_intent.payment_failed':
        this.logger.warn(`PaymentIntent failed: ${(event.data.object as Stripe.PaymentIntent).id}`);
        break;
      case 'account.updated':
        this.logger.log(`Stripe account updated: ${(event.data.object as Stripe.Account).id}`);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }
}
