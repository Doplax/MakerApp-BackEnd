import { NotFoundException } from '@nestjs/common';
import { PrinterCatalogService } from './printer-catalog.service';
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

  const buildService = (repo = buildRepo(), cloudinary = { deleteByUrl: jest.fn() }) =>
    ({
      service: new PrinterCatalogService(repo as never, cloudinary as never),
      repo,
      cloudinary,
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
