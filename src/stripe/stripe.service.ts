import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

// InstanceType evita el error TS2709 "Cannot use namespace Stripe as a type"
type StripeClient = InstanceType<typeof Stripe>;

@Injectable()
export class StripeService {
  private _stripe: StripeClient | null = null;
  private readonly logger = new Logger(StripeService.name);
  private readonly feePercent: number;

  constructor(private readonly config: ConfigService) {
    this.feePercent = Number(config.get('STRIPE_PLATFORM_FEE_PERCENT') ?? 5);
  }

  private get stripe(): StripeClient {
    if (!this._stripe) {
      const key = this.config.get<string>('STRIPE_SECRET_KEY');
      if (!key) {
        throw new BadRequestException(
          'Stripe no está configurado en este entorno',
        );
      }
      this._stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
    }
    return this._stripe;
  }

  // ── Connect: onboarding ──────────────────────────────────────

  async createConnectAccount(email: string): Promise<string> {
    const account = await this.stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    return account.id;
  }

  async createAccountLink(
    accountId: string,
    returnUrl: string,
    refreshUrl: string,
  ): Promise<string> {
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
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
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
      throw new BadRequestException(
        'El maker no tiene cuenta de Stripe configurada',
      );
    }

    const fee = Math.round((amount * this.feePercent) / 100);
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

  constructWebhookEvent(payload: Buffer, signature: string): object {
    const secret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }

  handleWebhookEvent(event: Record<string, unknown>): void {
    const type = event['type'] as string;
    const object = (event['data'] as Record<string, unknown>)?.[
      'object'
    ] as Record<string, unknown>;

    switch (type) {
      case 'payment_intent.succeeded':
        this.logger.log(`PaymentIntent succeeded: ${object?.['id']}`);
        break;
      case 'payment_intent.payment_failed':
        this.logger.warn(`PaymentIntent failed: ${object?.['id']}`);
        break;
      case 'account.updated':
        this.logger.log(`Stripe account updated: ${object?.['id']}`);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event: ${type}`);
    }
  }
}
