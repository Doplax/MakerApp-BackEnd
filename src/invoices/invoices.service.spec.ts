import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { Invoice } from './entities/invoice.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { User } from '../users/entities/user.entity';
import { PurchaseStatus } from '../purchases/enums/purchase-status.enum';

/**
 * Emisión de facturas persistidas: número correlativo (contador atómico),
 * idempotencia por compra, autorización (solo el maker de la venta) e importes
 * VAT-inclusive derivados del total realmente cobrado.
 */
describe('InvoicesService', () => {
  function setup(store: {
    pre?: unknown; // factura ya existente (fast-path idempotencia)
    invoiceInTx?: unknown; // factura encontrada dentro de la transacción
    purchase?: unknown;
    seq?: number; // valor que devuelve el contador atómico
    maker?: unknown;
  }) {
    const manager = {
      // findOne(Purchase) se usa para el lock y para cargar relaciones; ambos → purchase.
      findOne: jest.fn(async (entity: unknown) => {
        if (entity === Invoice) return store.invoiceInTx ?? null;
        if (entity === Purchase) return store.purchase ?? null;
        if (entity === User) return store.maker ?? null;
        return null;
      }),
      query: jest.fn(async () => [{ lastNumber: store.seq ?? 1 }]),
      create: jest.fn((_entity: unknown, data: unknown) => data),
      save: jest.fn(async (obj: unknown) => obj),
    };
    const dataSource = { transaction: jest.fn(async (cb: (m: unknown) => unknown) => cb(manager)) };
    const invoiceRepo = { find: jest.fn(), findOne: jest.fn().mockResolvedValue(store.pre ?? null) };
    const service = new InvoicesService(invoiceRepo as never, dataSource as never);
    return { service, manager, dataSource, invoiceRepo };
  }

  const succeededPurchase = {
    id: 'pur1',
    status: PurchaseStatus.SUCCEEDED,
    amount: 12100, // 121,00 € cobrados (IVA incluido)
    currency: 'eur',
    maker: { id: 'maker1' },
    buyer: { id: 'buyer1', fullName: 'Cliente' },
    project: { id: 'proj1', name: 'Llavero' },
  };

  const maker = {
    id: 'maker1',
    companyName: 'ACME 3D',
    nifCif: 'B12345678',
    fiscalAddress: 'Calle Falsa 123',
    chargesVat: true,
    vatPercent: 21,
    fullName: 'Ana Maker',
  };

  it('emite la primera factura con número correlativo e importes VAT-inclusive', async () => {
    const { service } = setup({ purchase: succeededPurchase, seq: 1, maker });
    const inv = (await service.issueForPurchase('pur1', 'maker1')) as {
      number: string;
      sequence: number;
      baseCents: number;
      vatCents: number;
      totalCents: number;
      makerName: string;
      clientName: string | null;
      concept: string | null;
    };
    expect(inv.number).toMatch(/^\d{4}-0001$/);
    expect(inv.sequence).toBe(1);
    // 121,00 € con 21% → base 100,00 € (10000cts) + IVA 21,00 € (2100cts).
    expect(inv.baseCents).toBe(10000);
    expect(inv.vatCents).toBe(2100);
    expect(inv.totalCents).toBe(12100);
    expect(inv.makerName).toBe('ACME 3D');
    expect(inv.clientName).toBe('Cliente');
    expect(inv.concept).toBe('Llavero');
  });

  it('usa el número correlativo que devuelve el contador atómico', async () => {
    const { service } = setup({ purchase: succeededPurchase, seq: 5, maker });
    const inv = (await service.issueForPurchase('pur1', 'maker1')) as { sequence: number; number: string };
    expect(inv.sequence).toBe(5);
    expect(inv.number).toMatch(/-0005$/);
  });

  it('es idempotente: si la compra ya tiene factura, la devuelve sin transacción', async () => {
    const existing = { id: 'inv1', number: '2026-0001', maker: { id: 'maker1' } };
    const { service, manager, dataSource } = setup({ pre: existing, purchase: succeededPurchase, maker });
    const inv = await service.issueForPurchase('pur1', 'maker1');
    expect(inv).toBe(existing);
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(manager.create).not.toHaveBeenCalled();
  });

  it('IDOR: NO devuelve una factura existente a quien no es su maker (fast-path autorizado)', async () => {
    const existing = { id: 'inv1', number: '2026-0001', maker: { id: 'maker1' } };
    const { service, dataSource } = setup({ pre: existing, purchase: succeededPurchase, maker });
    await expect(service.issueForPurchase('pur1', 'ATACANTE')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rechaza facturar una venta que no es del maker (autorización)', async () => {
    const { service } = setup({ purchase: succeededPurchase, maker });
    await expect(service.issueForPurchase('pur1', 'OTRO_MAKER')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rechaza facturar una compra no completada', async () => {
    const { service } = setup({
      purchase: { ...succeededPurchase, status: PurchaseStatus.PENDING },
      maker,
    });
    await expect(service.issueForPurchase('pur1', 'maker1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('no aplica IVA si el maker no factura IVA (base = total)', async () => {
    const { service } = setup({
      purchase: succeededPurchase,
      seq: 1,
      maker: { ...maker, chargesVat: false },
    });
    const inv = (await service.issueForPurchase('pur1', 'maker1')) as {
      baseCents: number;
      vatCents: number;
      totalCents: number;
    };
    expect(inv.baseCents).toBe(12100);
    expect(inv.vatCents).toBe(0);
    expect(inv.totalCents).toBe(12100);
  });

  // ── Datos fiscales del emisor obligatorios ───────────────────────────
  it('rechaza emitir si el maker no tiene NIF/CIF y NO consume el contador', async () => {
    const { service, manager } = setup({
      purchase: succeededPurchase,
      seq: 1,
      maker: { ...maker, nifCif: null },
    });
    await expect(service.issueForPurchase('pur1', 'maker1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    // No se toca la secuencia ni se crea/guarda factura.
    expect(manager.query).not.toHaveBeenCalled();
    expect(manager.create).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('rechaza emitir si el maker no tiene dirección fiscal y NO consume el contador', async () => {
    const { service, manager } = setup({
      purchase: succeededPurchase,
      seq: 1,
      maker: { ...maker, fiscalAddress: '   ' }, // vacío tras trim
    });
    await expect(service.issueForPurchase('pur1', 'maker1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(manager.query).not.toHaveBeenCalled();
    expect(manager.create).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('emite normalmente cuando el maker tiene NIF y dirección fiscal (consume contador)', async () => {
    const { service, manager } = setup({ purchase: succeededPurchase, seq: 1, maker });
    const inv = (await service.issueForPurchase('pur1', 'maker1')) as {
      makerNif: string | null;
      makerAddress: string | null;
    };
    expect(manager.query).toHaveBeenCalledTimes(1);
    expect(manager.save).toHaveBeenCalledTimes(1);
    expect(inv.makerNif).toBe('B12345678');
    expect(inv.makerAddress).toBe('Calle Falsa 123');
  });

  // ── Autorización de LECTURA ──────────────────────────────────────────
  describe('findOneAuthorized', () => {
    const invoice = {
      id: 'inv1',
      number: '2026-0001',
      maker: { id: 'maker1' },
      buyer: { id: 'buyer1' },
      project: { id: 'proj1', name: 'Llavero' },
    };

    it('devuelve la factura al maker emisor', async () => {
      const invoiceRepo = { find: jest.fn(), findOne: jest.fn().mockResolvedValue(invoice) };
      const dataSource = { transaction: jest.fn() };
      const service = new InvoicesService(invoiceRepo as never, dataSource as never);

      const result = await service.findOneAuthorized('inv1', 'maker1');
      expect(result).toBe(invoice);
      expect(invoiceRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'inv1' },
        relations: ['maker', 'buyer', 'project'],
      });
    });

    it('devuelve la factura al comprador', async () => {
      const invoiceRepo = { find: jest.fn(), findOne: jest.fn().mockResolvedValue(invoice) };
      const dataSource = { transaction: jest.fn() };
      const service = new InvoicesService(invoiceRepo as never, dataSource as never);

      const result = await service.findOneAuthorized('inv1', 'buyer1');
      expect(result).toBe(invoice);
    });

    it('rechaza a un tercero autenticado con ForbiddenException', async () => {
      const invoiceRepo = { find: jest.fn(), findOne: jest.fn().mockResolvedValue(invoice) };
      const dataSource = { transaction: jest.fn() };
      const service = new InvoicesService(invoiceRepo as never, dataSource as never);

      await expect(service.findOneAuthorized('inv1', 'tercero')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('lanza NotFoundException si la factura no existe', async () => {
      const invoiceRepo = { find: jest.fn(), findOne: jest.fn().mockResolvedValue(null) };
      const dataSource = { transaction: jest.fn() };
      const service = new InvoicesService(invoiceRepo as never, dataSource as never);

      await expect(service.findOneAuthorized('nope', 'maker1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findForMaker', () => {
    it('filtra por el id del maker (where maker.id) y ordena por fecha desc', async () => {
      const rows = [{ id: 'inv1' }, { id: 'inv2' }];
      const invoiceRepo = { find: jest.fn().mockResolvedValue(rows), findOne: jest.fn() };
      const dataSource = { transaction: jest.fn() };
      const service = new InvoicesService(invoiceRepo as never, dataSource as never);

      const result = await service.findForMaker('maker1');
      expect(result).toBe(rows);
      expect(invoiceRepo.find).toHaveBeenCalledWith({
        where: { maker: { id: 'maker1' } },
        relations: ['buyer', 'project'],
        order: { createdAt: 'DESC' },
      });
    });
  });
});
