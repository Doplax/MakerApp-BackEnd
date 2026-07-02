import { BadRequestException } from '@nestjs/common';
import { StripeController } from './stripe.controller';

/**
 * El control de seguridad más importante de la facturación: el importe y el
 * destinatario del cobro se DERIVAN en el servidor (precio del proyecto en BD +
 * stripeAccountId del maker). NUNCA se confía en `dto.amount`. Un fallo aquí
 * permitiría pagar 1 céntimo por cualquier proyecto o manipular transferencias.
 */
describe('StripeController', () => {
  let stripeService: {
    createPaymentIntent: jest.Mock;
    createConnectAccount: jest.Mock;
    createAccountLink: jest.Mock;
  };
  let config: { get: jest.Mock };
  let projectRepo: { findOne: jest.Mock };
  let userRepo: { update: jest.Mock; findOne: jest.Mock };
  let controller: StripeController;

  beforeEach(() => {
    stripeService = {
      createPaymentIntent: jest.fn().mockResolvedValue({ clientSecret: 'cs', paymentIntentId: 'pi' }),
      createConnectAccount: jest.fn().mockResolvedValue('acct_new'),
      createAccountLink: jest.fn().mockResolvedValue('https://onboard'),
    };
    config = { get: jest.fn().mockReturnValue('http://localhost:4210') };
    projectRepo = { findOne: jest.fn() };
    // findOne (re-lectura del usuario en onboard) devuelve null → cae al CurrentUser.
    userRepo = { update: jest.fn().mockResolvedValue(undefined), findOne: jest.fn().mockResolvedValue(null) };
    controller = new StripeController(
      stripeService as never,
      config as never,
      projectRepo as never,
      userRepo as never,
    );
  });

  describe('createPaymentIntent', () => {
    const buyer = { id: 'buyer1' } as never;
    const project = {
      id: 'proj1',
      isPublic: true,
      price: 10,
      createdBy: { id: 'maker1', stripeAccountId: 'acct_maker', chargesEnabled: true },
    };

    it('deriva el importe del precio del proyecto e IGNORA dto.amount', async () => {
      projectRepo.findOne.mockResolvedValue(project);
      await controller.createPaymentIntent(
        { projectId: 'proj1', amount: 1, currency: 'eur' } as never,
        buyer,
      );
      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
        1000, // 10 € × 100 céntimos — NO el dto.amount = 1
        'eur',
        'acct_maker',
        { projectId: 'proj1', buyerId: 'buyer1', makerId: 'maker1' },
      );
    });

    it('IGNORA dto.currency y usa SIEMPRE eur (moneda derivada en servidor)', async () => {
      projectRepo.findOne.mockResolvedValue(project);
      await controller.createPaymentIntent(
        { projectId: 'proj1', currency: 'usd' } as never,
        buyer,
      );
      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
        1000,
        'eur', // NO 'usd' aunque el dto la pida
        'acct_maker',
        { projectId: 'proj1', buyerId: 'buyer1', makerId: 'maker1' },
      );
    });

    it('redondea a céntimos con price=19.99 → amount 1999 (sin errores de coma flotante)', async () => {
      projectRepo.findOne.mockResolvedValue({ ...project, price: 19.99 });
      await controller.createPaymentIntent({ projectId: 'proj1' } as never, buyer);
      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
        1999,
        'eur',
        'acct_maker',
        expect.objectContaining({ projectId: 'proj1' }),
      );
    });

    it('rechaza si el maker tiene stripeAccountId pero chargesEnabled=false', async () => {
      projectRepo.findOne.mockResolvedValue({
        ...project,
        createdBy: { id: 'maker1', stripeAccountId: 'acct_maker', chargesEnabled: false },
      });
      await expect(
        controller.createPaymentIntent({ projectId: 'proj1' } as never, buyer),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(stripeService.createPaymentIntent).not.toHaveBeenCalled();
    });

    it('rechaza si el proyecto no existe', async () => {
      projectRepo.findOne.mockResolvedValue(null);
      await expect(
        controller.createPaymentIntent({ projectId: 'x' } as never, buyer),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza si el proyecto no es público', async () => {
      projectRepo.findOne.mockResolvedValue({ ...project, isPublic: false });
      await expect(
        controller.createPaymentIntent({ projectId: 'proj1' } as never, buyer),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza si el precio es 0 o negativo', async () => {
      projectRepo.findOne.mockResolvedValue({ ...project, price: 0 });
      await expect(
        controller.createPaymentIntent({ projectId: 'proj1' } as never, buyer),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('impide comprar tu propio proyecto', async () => {
      projectRepo.findOne.mockResolvedValue(project);
      await expect(
        controller.createPaymentIntent({ projectId: 'proj1' } as never, { id: 'maker1' } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza si el maker no tiene pagos (stripeAccountId) configurados', async () => {
      projectRepo.findOne.mockResolvedValue({
        ...project,
        createdBy: { id: 'maker1', stripeAccountId: null },
      });
      await expect(
        controller.createPaymentIntent({ projectId: 'proj1' } as never, buyer),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('onboard — persistencia de la cuenta Connect', () => {
    it('reutiliza la cuenta existente sin crear ni persistir una nueva', async () => {
      const res = await controller.onboard({
        id: 'u1',
        email: 'a@b.c',
        stripeAccountId: 'acct_existing',
      } as never);
      expect(stripeService.createConnectAccount).not.toHaveBeenCalled();
      expect(userRepo.update).not.toHaveBeenCalled();
      expect(res.accountId).toBe('acct_existing');
    });

    it('crea y PERSISTE la cuenta cuando el maker no tiene una', async () => {
      const res = await controller.onboard({
        id: 'u1',
        email: 'a@b.c',
        stripeAccountId: null,
      } as never);
      expect(stripeService.createConnectAccount).toHaveBeenCalledWith('a@b.c');
      expect(userRepo.update).toHaveBeenCalledWith('u1', { stripeAccountId: 'acct_new' });
      expect(res.accountId).toBe('acct_new');
    });
  });
});
