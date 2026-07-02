import { NotFoundException } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchaseStatus } from './enums/purchase-status.enum';

/**
 * Stripe entrega los webhooks "al menos una vez" y reintenta. El registro de
 * compras DEBE ser idempotente: una segunda entrega del mismo PaymentIntent no
 * puede duplicar la venta, ni el email, ni la notificación (dinero real).
 */
describe('PurchasesService', () => {
  let purchaseRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    count: jest.Mock;
  };
  let projectRepo: { findOne: jest.Mock };
  let userRepo: { findOne: jest.Mock };
  let mail: { sendOrderConfirmation: jest.Mock };
  let notifications: { create: jest.Mock };
  let service: PurchasesService;

  beforeEach(() => {
    purchaseRepo = {
      findOne: jest.fn(),
      create: jest.fn((x: unknown) => x),
      save: jest.fn(async (x: Record<string, unknown>) => ({ id: 'pur1', ...x })),
      count: jest.fn(),
    };
    projectRepo = { findOne: jest.fn() };
    userRepo = { findOne: jest.fn() };
    mail = { sendOrderConfirmation: jest.fn().mockResolvedValue(undefined) };
    notifications = { create: jest.fn().mockResolvedValue(undefined) };
    service = new PurchasesService(
      purchaseRepo as never,
      projectRepo as never,
      userRepo as never,
      mail as never,
      notifications as never,
    );
  });

  it('es idempotente: una entrega repetida NO crea otra compra ni reenvía email/notificación', async () => {
    purchaseRepo.findOne.mockResolvedValue({
      id: 'pur1',
      paymentIntentId: 'pi_1',
      status: PurchaseStatus.PENDING,
    });
    const res = await service.recordSucceeded({
      paymentIntentId: 'pi_1',
      amount: 1000,
      currency: 'eur',
    });
    expect(res.status).toBe(PurchaseStatus.SUCCEEDED);
    expect(purchaseRepo.create).not.toHaveBeenCalled();
    expect(mail.sendOrderConfirmation).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('registra una compra nueva, envía email al comprador y notifica al maker', async () => {
    purchaseRepo.findOne.mockResolvedValue(null);
    projectRepo.findOne.mockResolvedValue({
      id: 'proj1',
      name: 'Llavero',
      createdBy: { id: 'maker1', fullName: 'Maker' },
    });
    userRepo.findOne.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === 'maker1') return { id: 'maker1', fullName: 'Maker' };
      if (where.id === 'buyer1') return { id: 'buyer1', fullName: 'Buyer', email: 'buyer@x.com' };
      return null;
    });

    await service.recordSucceeded({
      paymentIntentId: 'pi_2',
      amount: 2500,
      currency: 'eur',
      projectId: 'proj1',
      makerId: 'maker1',
      buyerId: 'buyer1',
    });

    expect(purchaseRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentIntentId: 'pi_2',
        amount: 2500,
        status: PurchaseStatus.SUCCEEDED,
      }),
    );
    // El importe se convierte de céntimos a euros para el email (2500 → 25).
    expect(mail.sendOrderConfirmation).toHaveBeenCalledWith('buyer@x.com', 'Maker', 'Llavero', 25);
    expect(notifications.create).toHaveBeenCalled();
  });

  it('usa project.createdBy como maker cuando no se pasa makerId', async () => {
    purchaseRepo.findOne.mockResolvedValue(null);
    projectRepo.findOne.mockResolvedValue({
      id: 'proj1',
      name: 'X',
      createdBy: { id: 'maker1', fullName: 'M' },
    });
    userRepo.findOne.mockResolvedValue(null); // sin buyer
    const res = await service.recordSucceeded({
      paymentIntentId: 'pi_3',
      amount: 1000,
      currency: 'eur',
      projectId: 'proj1',
    });
    expect(res.id).toBe('pur1');
  });

  it('lanza NotFound si no se puede determinar el maker', async () => {
    purchaseRepo.findOne.mockResolvedValue(null);
    projectRepo.findOne.mockResolvedValue(null);
    await expect(
      service.recordSucceeded({ paymentIntentId: 'pi_4', amount: 1000, currency: 'eur' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('el fallo del email de confirmación NO rompe el registro de la compra', async () => {
    purchaseRepo.findOne.mockResolvedValue(null);
    projectRepo.findOne.mockResolvedValue({
      id: 'proj1',
      name: 'X',
      createdBy: { id: 'maker1', fullName: 'M' },
    });
    userRepo.findOne.mockImplementation(async ({ where }: { where: { id: string } }) =>
      where.id === 'buyer1'
        ? { id: 'buyer1', email: 'b@x.com' }
        : { id: 'maker1', fullName: 'M' },
    );
    mail.sendOrderConfirmation.mockRejectedValue(new Error('SMTP down'));

    const res = await service.recordSucceeded({
      paymentIntentId: 'pi_5',
      amount: 1000,
      currency: 'eur',
      projectId: 'proj1',
      makerId: 'maker1',
      buyerId: 'buyer1',
    });
    expect(res.id).toBe('pur1');
  });
});
