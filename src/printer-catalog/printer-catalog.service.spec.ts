import { NotFoundException } from '@nestjs/common';
import { PrinterCatalogService } from './printer-catalog.service';
import { DEFAULT_PRINTER_CATALOG } from './default-printer-catalog';
import type { PrinterCatalog } from './entities/printer-catalog.entity';

describe('PrinterCatalogService', () => {
  const buildRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto: Partial<PrinterCatalog>) => ({ ...dto })),
    save: jest.fn((entity: Partial<PrinterCatalog>) =>
      Promise.resolve({ id: 'generated', ...entity }),
    ),
    remove: jest.fn().mockResolvedValue(undefined),
  });

  const buildService = (
    repo = buildRepo(),
    cloudinary = { deleteByUrl: jest.fn() },
    brands = { resolveIdForName: jest.fn().mockResolvedValue(null) },
  ) => ({
    service: new PrinterCatalogService(
      repo as never,
      cloudinary as never,
      brands as never,
    ),
    repo,
    cloudinary,
    brands,
  });

  it('findOne lanza NotFoundException si el id no existe', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('bulkUpsert crea las entradas que no existen (clave brand+model)', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue(null);

    const result = await service.bulkUpsert([
      { brand: 'Bambu Lab', model: 'A1' },
      { brand: 'Prusa', model: 'MK4s' },
    ] as never);

    expect(result).toEqual({ created: 2, updated: 0, total: 2 });
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { brand: 'Bambu Lab', model: 'A1' },
    });
    expect(repo.save).toHaveBeenCalledTimes(2);
  });

  it('bulkUpsert actualiza la entrada existente sin crear duplicados', async () => {
    const { service, repo } = buildService();
    const existing = { id: 'cat-1', brand: 'Prusa', model: 'MK4s', buildVolumeX: null };
    repo.findOne.mockResolvedValue(existing);

    const result = await service.bulkUpsert([
      { brand: 'Prusa', model: 'MK4s', buildVolumeX: 250 },
    ] as never);

    expect(result).toEqual({ created: 0, updated: 1, total: 1 });
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cat-1', buildVolumeX: 250 }),
    );
  });

  it('seedDefaults hace upsert de todo el catálogo predefinido', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue(null);

    const result = await service.seedDefaults();

    expect(result.total).toBe(DEFAULT_PRINTER_CATALOG.length);
    expect(result.created).toBe(DEFAULT_PRINTER_CATALOG.length);
    expect(repo.save).toHaveBeenCalledTimes(DEFAULT_PRINTER_CATALOG.length);
  });

  describe('DEFAULT_PRINTER_CATALOG (dataset)', () => {
    it('no tiene duplicados por marca+modelo (clave del upsert)', () => {
      const keys = DEFAULT_PRINTER_CATALOG.map((m) => `${m.brand}|${m.model}`.toLowerCase());
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('la H2D es de doble extrusor y todas las specs son positivas', () => {
      const h2d = DEFAULT_PRINTER_CATALOG.find((m) => m.model === 'H2D');
      expect(h2d?.extruderCount).toBe(2);
      for (const m of DEFAULT_PRINTER_CATALOG) {
        for (const v of [m.extruderMaxTemp, m.bedMaxTemp, m.maxSpeed, m.extruderCount]) {
          if (v != null) expect(v).toBeGreaterThan(0);
        }
      }
    });

    it('los volúmenes, si se definen, vienen completos (X, Y y Z)', () => {
      for (const m of DEFAULT_PRINTER_CATALOG) {
        const dims = [m.buildVolumeX, m.buildVolumeY, m.buildVolumeZ].filter((d) => d != null);
        expect(dims.length === 0 || dims.length === 3).toBe(true);
      }
    });
  });

  it('update borra la imagen anterior solo si cambió', async () => {
    const { service, repo, cloudinary } = buildService();
    repo.findOne.mockResolvedValue({
      id: 'cat-1',
      brand: 'Prusa',
      model: 'MK4s',
      imageUrl: 'http://api/uploads/old.png',
    });

    await service.update('cat-1', { imageUrl: 'http://api/uploads/new.png' } as never);

    expect(cloudinary.deleteByUrl).toHaveBeenCalledWith(
      'http://api/uploads/old.png',
    );
  });
});
