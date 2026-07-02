import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { PurchasesService } from '../purchases/purchases.service.js';
import { PurchaseStatus } from '../purchases/enums/purchase-status.enum.js';
import { User } from '../users/entities/user.entity.js';

// InstanceType evita el error TS2709 "Cannot use namespace Stripe as a type"
type StripeClient = InstanceType<typeof Stripe>;

@Injectable()
export class StripeService {
  private _stripe: StripeClient | null = null;
  private readonly logger = new Logger(StripeService.name);
  private readonly feePercent: number;

  constructor(
    private readonly config: ConfigService,
    private readonly purchases: PurchasesService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    this.feePercent = Number(config.get('STRIPE_PLATFORM_FEE_PERCENT') ?? 5);
  }

  /** true si hay una secret key real configurada (no vacía ni el placeholder). */
  isConfigured(): boolean {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    return !!key && /^sk_(test|live)_/.test(key) && !key.includes('xxx');
  }

  private get stripe(): StripeClient {
    if (!this._stripe) {
      if (!this.isConfigured()) {
        throw new ServiceUnavailableException(
          'Stripe no está configurado en este entorno',
        );
      }
      const key = this.config.getOrThrow<string>('STRIPE_SECRET_KEY');
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

  async handleWebhookEvent(event: Record<string, unknown>): Promise<void> {
    const type = event['type'] as string;
    const object = (event['data'] as Record<string, unknown>)?.[
      'object'
    ] as Record<string, unknown>;

    switch (type) {
      case 'payment_intent.succeeded': {
        const paymentIntentId = object?.['id'] as string;
        const amount = Number(object?.['amount'] ?? 0);
        const currency = (object?.['currency'] as string) ?? 'eur';
        const metadata = (object?.['metadata'] as Record<string, string>) ?? {};
        this.logger.log(`PaymentIntent succeeded: ${paymentIntentId}`);
        try {
          await this.purchases.recordSucceeded({
            paymentIntentId,
            amount,
            currency,
            projectId: metadata['projectId'],
            buyerId: metadata['buyerId'],
            makerId: metadata['makerId'],
          });
        } catch (e) {
          this.logger.error(
            `Error registrando compra para ${paymentIntentId}: ${(e as Error).message}`,
          );
        }
        break;
      }
      case 'payment_intent.payment_failed':
        this.logger.warn(`PaymentIntent failed: ${object?.['id']}`);
        break;
      case 'payment_intent.canceled': {
        const paymentIntentId = object?.['id'] as string;
        this.logger.warn(`PaymentIntent canceled: ${paymentIntentId}`);
        try {
          await this.purchases.updateStatusByPaymentIntent(
            paymentIntentId,
            PurchaseStatus.FAILED,
          );
        } catch (e) {
          this.logger.error(`Error marcando cancelado ${paymentIntentId}: ${(e as Error).message}`);
        }
        break;
      }
      // Reembolso TOTAL o disputa: la venta deja de ser válida → REFUNDED. Esto
      // excluye la compra de los ingresos y revoca la elegibilidad para reseñar.
      // Un reembolso PARCIAL (amount_refunded < amount) NO invalida la venta.
      case 'charge.refunded': {
        const paymentIntentId = object?.['payment_intent'] as string;
        const amount = Number(object?.['amount'] ?? 0);
        const refunded = Number(object?.['amount_refunded'] ?? 0);
        if (refunded < amount) {
          this.logger.log(
            `Reembolso parcial (${refunded}/${amount}) en PI ${paymentIntentId}: la venta sigue válida`,
          );
          break;
        }
        this.logger.log(`Charge refunded (total): PI ${paymentIntentId}`);
        try {
          await this.purchases.updateStatusByPaymentIntent(
            paymentIntentId,
            PurchaseStatus.REFUNDED,
          );
        } catch (e) {
          this.logger.error(`Error marcando reembolso ${paymentIntentId}: ${(e as Error).message}`);
        }
        break;
      }
      case 'charge.dispute.created': {
        const paymentIntentId = object?.['payment_intent'] as string;
        this.logger.log(`Charge dispute: PI ${paymentIntentId}`);
        try {
          await this.purchases.updateStatusByPaymentIntent(
            paymentIntentId,
            PurchaseStatus.REFUNDED,
          );
        } catch (e) {
          this.logger.error(`Error marcando disputa ${paymentIntentId}: ${(e as Error).message}`);
        }
        break;
      }
      case 'account.updated': {
        const accountId = object?.['id'] as string;
        const chargesEnabled = !!object?.['charges_enabled'];
        this.logger.log(
          `Stripe account updated: ${accountId} (charges_enabled=${chargesEnabled})`,
        );
        try {
          // Sincroniza el estado real para que acceptsPayments (perfil público)
          // solo sea true cuando el maker puede cobrar de verdad.
          await this.userRepo.update({ stripeAccountId: accountId }, { chargesEnabled });
        } catch (e) {
          this.logger.error(
            `Error sincronizando charges_enabled de ${accountId}: ${(e as Error).message}`,
          );
        }
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event: ${type}`);
    }
  }
}
