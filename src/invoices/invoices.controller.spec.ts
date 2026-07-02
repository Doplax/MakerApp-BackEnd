import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { Invoice } from './entities/invoice.entity';
import { User } from '../users/entities/user.entity';

/**
 * Controller de facturas: serialización toDto (céntimos → unidades de moneda) y
 * delegación en el servicio pasando SIEMPRE el id del usuario autenticado (base
 * de la autorización de lectura/emisión).
 */
describe('InvoicesController', () => {
  function setup() {
    const service = {
      issueForPurchase: jest.fn(),
      findForMaker: jest.fn(),
      findOneAuthorized: jest.fn(),
    };
    const controller = new InvoicesController(service as unknown as InvoicesService);
    return { controller, service };
  }

  // Factura persistida (céntimos) → 100,00 base + 21,00 IVA (21%) = 121,00 total.
  const invoice = {
    id: 'inv1',
    number: '2026-0001',
    issueDate: new Date('2026-07-02T10:00:00Z'),
    concept: 'Llavero',
    makerName: 'ACME 3D',
    makerNif: 'B12345678',
    makerAddress: 'Calle Falsa 123',
    clientName: 'Cliente',
    clientNif: 'X1234567L',
    clientAddress: 'Av. Siempreviva 742',
    baseCents: 10000,
    vatPercent: 21,
    vatCents: 2100,
    totalCents: 12100,
    currency: 'eur',
    project: { id: 'proj1', name: 'Llavero' },
  } as unknown as Invoice;

  const user = { id: 'user1' } as User;

  describe('toDto (vía issue)', () => {
    it('convierte céntimos a unidades de moneda y proyecta las partes', async () => {
      const { controller, service } = setup();
      service.issueForPurchase.mockResolvedValue(invoice);

      const dto = await controller.issue('pur1', user);

      expect(dto.base).toBe(100);
      expect(dto.vatAmount).toBe(21);
      expect(dto.total).toBe(121);
      expect(dto.vatPercent).toBe(21);
      expect(typeof dto.vatPercent).toBe('number');
      expect(dto.currency).toBe('eur');
      expect(dto.id).toBe('inv1');
      expect(dto.number).toBe('2026-0001');
      expect(dto.concept).toBe('Llavero');
      expect(dto.maker).toEqual({ name: 'ACME 3D', nif: 'B12345678', address: 'Calle Falsa 123' });
      expect(dto.client).toEqual({
        name: 'Cliente',
        nif: 'X1234567L',
        address: 'Av. Siempreviva 742',
      });
      expect(dto.project).toEqual({ id: 'proj1', name: 'Llavero' });
    });

    it('parsea vatPercent aunque llegue como string (columna decimal)', async () => {
      const { controller, service } = setup();
      service.issueForPurchase.mockResolvedValue({
        ...invoice,
        vatPercent: '21.00',
      } as unknown as Invoice);

      const dto = await controller.issue('pur1', user);
      expect(dto.vatPercent).toBe(21);
    });

    it('deja project a null si la factura no tiene proyecto', async () => {
      const { controller, service } = setup();
      service.issueForPurchase.mockResolvedValue({
        ...invoice,
        project: null,
      } as unknown as Invoice);

      const dto = await controller.issue('pur1', user);
      expect(dto.project).toBeNull();
    });
  });

  describe('delegación con el id del usuario autenticado', () => {
    it('issue pasa purchaseId y user.id a issueForPurchase', async () => {
      const { controller, service } = setup();
      service.issueForPurchase.mockResolvedValue(invoice);

      await controller.issue('pur1', user);
      expect(service.issueForPurchase).toHaveBeenCalledWith('pur1', 'user1');
    });

    it('list pasa user.id a findForMaker y serializa cada fila', async () => {
      const { controller, service } = setup();
      service.findForMaker.mockResolvedValue([invoice]);

      const result = await controller.list(user);
      expect(service.findForMaker).toHaveBeenCalledWith('user1');
      expect(result).toHaveLength(1);
      expect(result[0].total).toBe(121);
    });

    it('detail pasa id y user.id a findOneAuthorized (autorización)', async () => {
      const { controller, service } = setup();
      service.findOneAuthorized.mockResolvedValue(invoice);

      const dto = await controller.detail('inv1', user);
      expect(service.findOneAuthorized).toHaveBeenCalledWith('inv1', 'user1');
      expect(dto.id).toBe('inv1');
      expect(dto.total).toBe(121);
    });
  });
});
