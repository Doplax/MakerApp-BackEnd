import { NotFoundException } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import type { Quote } from './entities/quote.entity';
import type { User } from '../users/entities/user.entity';

/**
 * Historial de presupuestos: lo crítico es el SCOPING por usuario y la
 * conversión euros → céntimos con el IVA POR ENCIMA de la base (misma
 * semántica que el PDF del invoice-modal).
 */
describe('QuotesService', () => {
  const me = { id: 'user-1' } as User;

  const buildRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto: Partial<Quote>) => ({ ...dto })),
    save: jest.fn((entity: Partial<Quote>) =>
      Promise.resolve({ id: 'generated', ...entity }),
    ),
    remove: jest.fn().mockResolvedValue(undefined),
  });

  const buildService = (repo = buildRepo()) => ({
    service: new QuotesService(repo as never),
    repo,
  });

  it('findAll filtra por el usuario, más recientes primero', async () => {
    const { service, repo } = buildService();
    repo.find.mockResolvedValue([]);

    await service.findAll(me);

    expect(repo.find).toHaveBeenCalledWith({
      where: { createdById: 'user-1' },
      order: { createdAt: 'DESC' },
    });
  });

  it('create convierte a céntimos y añade el IVA por encima de la base', async () => {
    const { service, repo } = buildService();

    await service.create(
      { reference: '20260713-001', base: 11.35, vatPercent: 21, clientName: 'Laia' },
      me,
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: '20260713-001',
        baseCents: 1135,
        vatPercent: 21,
        vatCents: 238,      // round(1135 × 21%)
        totalCents: 1373,   // 11,35 + 2,38 = 13,73 €
        clientName: 'Laia',
        createdById: 'user-1',
      }),
    );
  });

  it('create sin IVA deja cuota 0 y total = base', async () => {
    const { service, repo } = buildService();

    await service.create({ reference: 'R-1', base: 10 }, me);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ baseCents: 1000, vatCents: 0, totalCents: 1000 }),
    );
  });

  it('findOne con id ajeno → NotFound (scoping)', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue(null);

    await expect(service.findOne('q-1', me)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 'q-1', createdById: 'user-1' },
    });
  });

  it('update re-guarda el snapshot recalculando céntimos sin duplicar', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue({
      id: 'q-1', reference: 'R-1', baseCents: 1000, vatPercent: 21,
      vatCents: 210, totalCents: 1210, clientName: null, createdById: 'user-1',
    });

    await service.update('q-1', { base: 20, clientName: 'Clau' }, me);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'q-1',            // MISMO registro (no se crea otro)
        clientName: 'Clau',
        baseCents: 2000,
        vatPercent: 21,       // conserva el IVA guardado si no viene
        vatCents: 420,
        totalCents: 2420,
      }),
    );
  });

  it('remove borra el presupuesto propio', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue({ id: 'q-1', reference: 'R-9', createdById: 'user-1' });

    const res = await service.remove('q-1', me);

    expect(repo.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'q-1' }));
    expect(res.message).toContain('R-9');
  });
});
