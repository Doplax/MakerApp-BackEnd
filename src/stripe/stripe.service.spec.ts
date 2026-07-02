import { BadRequestException } from '@nestjs/common';
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
  return new StripeService(config as never, purchases as never);
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
});
