import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { StripeService } from './stripe.service';

function makeService(secretKey?: string, feePercent?: string) {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'STRIPE_SECRET_KEY') return secretKey;
      if (key === 'STRIPE_PLATFORM_FEE_PERCENT') return feePercent;
      return undefined;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === 'STRIPE_SECRET_KEY') return secretKey;
      throw new Error('missing ' + key);
    }),
  };
  const purchases = { recordSucceeded: jest.fn() };
  const userRepo = { update: jest.fn() };
  return new StripeService(config as never, purchases as never, userRepo as never);
}

describe('StripeService', () => {
  describe('isConfigured', () => {
    it('acepta una secret key real', () => {
      expect(makeService('sk_test_123abc').isConfigured()).toBe(true);
    });
    it('rechaza el placeholder xxx', () => {
      expect(makeService('sk_test_xxx').isConfigured()).toBe(false);
    });
    it('rechaza cuando no hay clave', () => {
      expect(makeService(undefined).isConfigured()).toBe(false);
    });
  });

  describe('createPaymentIntent', () => {
    it('calcula la comisión de plataforma (5% por defecto) y usa transfer_data al maker', async () => {
      const service = makeService('sk_test_123');
      const create = jest.fn().mockResolvedValue({ client_secret: 'cs', id: 'pi_1' });
      (service as unknown as { _stripe: unknown })._stripe = { paymentIntents: { create } };

      const res = await service.createPaymentIntent(1000, 'eur', 'acct_maker', { projectId: 'p1' });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1000,
          currency: 'eur',
          application_fee_amount: 50, // 5% de 1000
          transfer_data: { destination: 'acct_maker' },
          metadata: { projectId: 'p1' },
        }),
      );
      expect(res).toEqual({ clientSecret: 'cs', paymentIntentId: 'pi_1' });
    });

    it('respeta un porcentaje de comisión configurado', async () => {
      const service = makeService('sk_test_123', '10');
      const create = jest.fn().mockResolvedValue({ client_secret: 'cs', id: 'pi_2' });
      (service as unknown as { _stripe: unknown })._stripe = { paymentIntents: { create } };

      await service.createPaymentIntent(2000, 'eur', 'acct_maker');
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ application_fee_amount: 200 }), // 10% de 2000
      );
    });

    it('rechaza si el maker no tiene cuenta de Stripe', async () => {
      const service = makeService('sk_test_123');
      await expect(
        service.createPaymentIntent(1000, 'eur', '', {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('handleWebhookEvent', () => {
    function makeWithPurchases() {
      const config = { get: jest.fn(), getOrThrow: jest.fn() };
      const purchases = {
        recordSucceeded: jest.fn().mockResolvedValue(undefined),
        updateStatusByPaymentIntent: jest.fn().mockResolvedValue(undefined),
      };
      const userRepo = { update: jest.fn().mockResolvedValue(undefined) };
      return {
        service: new StripeService(config as never, purchases as never, userRepo as never),
        purchases,
        userRepo,
      };
    }

    it('payment_intent.succeeded → registra la compra', async () => {
      const { service, purchases } = makeWithPurchases();
      await service.handleWebhookEvent({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_1', amount: 1000, currency: 'eur', metadata: { projectId: 'p1' } } },
      });
      expect(purchases.recordSucceeded).toHaveBeenCalledWith(
        expect.objectContaining({ paymentIntentId: 'pi_1', amount: 1000 }),
      );
    });

    it('charge.refunded TOTAL → marca la compra como REFUNDED', async () => {
      const { service, purchases } = makeWithPurchases();
      await service.handleWebhookEvent({
        type: 'charge.refunded',
        data: { object: { id: 'ch_1', payment_intent: 'pi_1', amount: 2000, amount_refunded: 2000 } },
      });
      expect(purchases.updateStatusByPaymentIntent).toHaveBeenCalledWith('pi_1', 'refunded');
    });

    it('charge.refunded PARCIAL → NO marca REFUNDED (la venta sigue válida)', async () => {
      const { service, purchases } = makeWithPurchases();
      await service.handleWebhookEvent({
        type: 'charge.refunded',
        data: { object: { id: 'ch_2', payment_intent: 'pi_2', amount: 2000, amount_refunded: 200 } },
      });
      expect(purchases.updateStatusByPaymentIntent).not.toHaveBeenCalled();
    });

    it('charge.dispute.created → marca la compra como REFUNDED', async () => {
      const { service, purchases } = makeWithPurchases();
      await service.handleWebhookEvent({
        type: 'charge.dispute.created',
        data: { object: { id: 'dp_1', payment_intent: 'pi_3' } },
      });
      expect(purchases.updateStatusByPaymentIntent).toHaveBeenCalledWith('pi_3', 'refunded');
    });

    it('payment_intent.canceled → marca la compra como FAILED', async () => {
      const { service, purchases } = makeWithPurchases();
      await service.handleWebhookEvent({
        type: 'payment_intent.canceled',
        data: { object: { id: 'pi_9' } },
      });
      expect(purchases.updateStatusByPaymentIntent).toHaveBeenCalledWith('pi_9', 'failed');
    });

    it('account.updated con charges_enabled=true → sincroniza chargesEnabled:true', async () => {
      const { service, userRepo } = makeWithPurchases();
      await service.handleWebhookEvent({
        type: 'account.updated',
        data: { object: { id: 'acct_x', charges_enabled: true } },
      });
      expect(userRepo.update).toHaveBeenCalledWith(
        { stripeAccountId: 'acct_x' },
        { chargesEnabled: true },
      );
    });

    it('account.updated sin charges_enabled → coerción !! a chargesEnabled:false', async () => {
      const { service, userRepo } = makeWithPurchases();
      await service.handleWebhookEvent({
        type: 'account.updated',
        data: { object: { id: 'acct_y' } },
      });
      expect(userRepo.update).toHaveBeenCalledWith(
        { stripeAccountId: 'acct_y' },
        { chargesEnabled: false },
      );
    });
  });

  describe('confirmPurchase (reconciliación)', () => {
    function make() {
      const config = { get: jest.fn(), getOrThrow: jest.fn() };
      const purchases = { recordSucceeded: jest.fn().mockResolvedValue(undefined) };
      const userRepo = { update: jest.fn() };
      const service = new StripeService(
        config as never,
        purchases as never,
        userRepo as never,
      );
      const retrieve = jest.fn();
      (service as unknown as { _stripe: unknown })._stripe = {
        paymentIntents: { retrieve },
      };
      return { service, purchases, retrieve };
    }

    it('PI succeeded → registra la compra y devuelve recorded:true', async () => {
      const { service, purchases, retrieve } = make();
      retrieve.mockResolvedValue({
        id: 'pi_1',
        status: 'succeeded',
        amount: 800,
        currency: 'eur',
        metadata: { projectId: 'p1', buyerId: 'b1', makerId: 'm1' },
      });
      const res = await service.confirmPurchase('pi_1', 'b1');
      expect(retrieve).toHaveBeenCalledWith('pi_1');
      expect(purchases.recordSucceeded).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentIntentId: 'pi_1',
          amount: 800,
          buyerId: 'b1',
          makerId: 'm1',
          projectId: 'p1',
        }),
      );
      expect(res).toEqual({ recorded: true, status: 'succeeded' });
    });

    it('PI no succeeded → NO registra y devuelve recorded:false con el estado', async () => {
      const { service, purchases, retrieve } = make();
      retrieve.mockResolvedValue({
        id: 'pi_2',
        status: 'processing',
        amount: 800,
        currency: 'eur',
        metadata: { buyerId: 'b1' },
      });
      const res = await service.confirmPurchase('pi_2', 'b1');
      expect(purchases.recordSucceeded).not.toHaveBeenCalled();
      expect(res).toEqual({ recorded: false, status: 'processing' });
    });

    it('comprador distinto del dueño del PI → ForbiddenException y NO registra', async () => {
      const { service, purchases, retrieve } = make();
      retrieve.mockResolvedValue({
        id: 'pi_3',
        status: 'succeeded',
        amount: 800,
        currency: 'eur',
        metadata: { buyerId: 'otro' },
      });
      await expect(service.confirmPurchase('pi_3', 'b1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(purchases.recordSucceeded).not.toHaveBeenCalled();
    });
  });
});
