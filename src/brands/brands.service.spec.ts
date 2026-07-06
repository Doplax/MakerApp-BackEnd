import { BadRequestException } from '@nestjs/common';
import { BrandsService } from './brands.service';

/**
 * Reconciliación de marcas de texto libre. Lo crítico: variantes de escritura
 * ("Bambu Lab" / "BambuLab") resuelven a UNA sola marca (por slug normalizado o
 * por alias), se crea si no existe, no se admiten duplicados equivalentes, y la
 * fusión mueve los productos y absorbe la marca origen como alias.
 */
function makeService() {
  const brandRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: Record<string, unknown>) => ({ id: 'new-id', ...x })),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const repoStub = { find: jest.fn().mockResolvedValue([]) };
  const dataSource = { transaction: jest.fn() };
  const service = new BrandsService(
    brandRepo as never,
    repoStub as never,
    repoStub as never,
    repoStub as never,
    repoStub as never,
    dataSource as never,
  );
  return { service, brandRepo, dataSource };
}

describe('BrandsService', () => {
  describe('resolveIdForName', () => {
    it('devuelve null para texto vacío o sin alfanuméricos', async () => {
      const { service } = makeService();
      expect(await service.resolveIdForName('')).toBeNull();
      expect(await service.resolveIdForName('   ')).toBeNull();
      expect(await service.resolveIdForName(null)).toBeNull();
    });

    it('las variantes resuelven a la MISMA marca por slug normalizado', async () => {
      const { service, brandRepo } = makeService();
      brandRepo.findOne.mockResolvedValue({ id: 'b1', slug: 'bambulab' });
      expect(await service.resolveIdForName('Bambu Lab')).toBe('b1');
      expect(await service.resolveIdForName('BambuLab')).toBe('b1');
      expect(brandRepo.findOne).toHaveBeenCalledWith({ where: { slug: 'bambulab' } });
    });

    it('reconcilia por alias cuando el slug no casa directamente', async () => {
      const { service, brandRepo } = makeService();
      brandRepo.findOne.mockResolvedValue(null);
      brandRepo.find.mockResolvedValue([
        { id: 'b2', slug: 'esun', aliases: ['eSUN Filament'] },
      ]);
      expect(await service.resolveIdForName('eSUN Filament')).toBe('b2');
    });

    it('crea la marca si no existe y devuelve su id', async () => {
      const { service, brandRepo } = makeService();
      brandRepo.save.mockResolvedValue({ id: 'created', name: 'Sunlu', slug: 'sunlu' });
      expect(await service.resolveIdForName('Sunlu')).toBe('created');
      expect(brandRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Sunlu', slug: 'sunlu' }),
      );
    });
  });

  describe('create', () => {
    it('rechaza crear una marca equivalente a una existente (dedupe por slug)', async () => {
      const { service, brandRepo } = makeService();
      brandRepo.findOne.mockResolvedValue({ id: 'b1', name: 'Bambu Lab', slug: 'bambulab' });
      await expect(service.create({ name: 'BambuLab' } as never)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('merge', () => {
    it('mueve los productos de las 4 tablas, absorbe la origen como alias y la borra', async () => {
      const { service, dataSource } = makeService();
      const target = { id: 't', name: 'Bambu Lab', slug: 'bambulab', aliases: [] as string[] };
      const source = { id: 's', name: 'BambuLabs', slug: 'bambulabs', aliases: ['BBL'] };
      const manager = {
        findOne: jest.fn(async (_e: unknown, opt: { where: { id: string } }) =>
          opt.where.id === 't' ? target : source,
        ),
        query: jest.fn().mockResolvedValue(undefined),
        save: jest.fn(async (x: unknown) => x),
        remove: jest.fn(),
      };
      dataSource.transaction.mockImplementation(
        async (cb: (m: unknown) => unknown) => cb(manager),
      );

      const res = (await service.merge('t', 's')) as { aliases: string[] };
      expect(manager.query).toHaveBeenCalledTimes(4); // UPDATE en las 4 tablas
      expect(manager.query.mock.calls[0][1]).toEqual(['t', 's']); // brandId s → t
      expect(res.aliases).toEqual(expect.arrayContaining(['BBL', 'BambuLabs']));
      expect(manager.remove).toHaveBeenCalledWith(source);
    });

    it('rechaza fusionar una marca consigo misma', async () => {
      const { service } = makeService();
      await expect(service.merge('x', 'x')).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
