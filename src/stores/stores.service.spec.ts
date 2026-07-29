import { NotFoundException } from '@nestjs/common';
import { StoresService } from './stores.service';
import type { Store } from './entities/store.entity';

describe('StoresService', () => {
  const buildRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto: Partial<Store>) => ({ ...dto })),
    save: jest.fn((entity: Partial<Store>) =>
      Promise.resolve({ id: 'generated', ...entity }),
    ),
    remove: jest.fn().mockResolvedValue(undefined),
  });

  const buildService = (
    repo = buildRepo(),
    cloudinary = { deleteByUrl: jest.fn() },
  ) => ({
    service: new StoresService(repo as never, cloudinary as never),
    repo,
    cloudinary,
  });

  it('findActive solo pide tiendas activas y ordenadas por orden y nombre', async () => {
    const { service, repo } = buildService();
    repo.find.mockResolvedValue([]);

    await service.findActive();

    expect(repo.find).toHaveBeenCalledWith({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  });

  it('findAllAdmin devuelve también las inactivas (sin filtro where)', async () => {
    const { service, repo } = buildService();
    repo.find.mockResolvedValue([]);

    await service.findAllAdmin();

    expect(repo.find).toHaveBeenCalledWith({
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  });

  it('findOne lanza NotFoundException si el id no existe', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create persiste la tienda con los datos del DTO', async () => {
    const { service, repo } = buildService();

    const created = await service.create({
      name: 'Filament2Print',
      url: 'https://filament2print.com',
    });

    expect(repo.create).toHaveBeenCalledWith({
      name: 'Filament2Print',
      url: 'https://filament2print.com',
    });
    expect(repo.save).toHaveBeenCalled();
    expect(created.name).toBe('Filament2Print');
    expect(created.id).toBe('generated');
  });

  it('update aplica los cambios del DTO sobre la tienda existente', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue({
      id: 's-1',
      name: 'Tienda',
      url: 'https://tienda.com',
      imageUrl: null,
    });

    const updated = await service.update('s-1', { name: 'Tienda editada' });

    expect(updated.name).toBe('Tienda editada');
    expect(updated.url).toBe('https://tienda.com');
  });

  it('update borra el logo anterior de /uploads solo si cambió', async () => {
    const { service, repo, cloudinary } = buildService();
    repo.findOne.mockResolvedValue({
      id: 's-1',
      name: 'Tienda',
      imageUrl: 'https://api.makerup.app/uploads/filaments/old.jpg',
    });

    await service.update('s-1', {
      imageUrl: 'https://api.makerup.app/uploads/filaments/new.jpg',
    });
    expect(cloudinary.deleteByUrl).toHaveBeenCalledWith(
      'https://api.makerup.app/uploads/filaments/old.jpg',
    );

    // Sin cambio de logo: no borra nada.
    cloudinary.deleteByUrl.mockClear();
    repo.findOne.mockResolvedValue({
      id: 's-1',
      name: 'Tienda',
      imageUrl: 'https://api.makerup.app/uploads/filaments/same.jpg',
    });
    await service.update('s-1', { name: 'Tienda editada' });
    expect(cloudinary.deleteByUrl).not.toHaveBeenCalled();
  });

  it('remove elimina la tienda y su logo del volumen', async () => {
    const { service, repo, cloudinary } = buildService();
    repo.findOne.mockResolvedValue({
      id: 's-1',
      name: 'Filament2Print',
      imageUrl: 'https://api.makerup.app/uploads/filaments/store.jpg',
    });

    const result = await service.remove('s-1');

    expect(repo.remove).toHaveBeenCalled();
    expect(cloudinary.deleteByUrl).toHaveBeenCalledWith(
      'https://api.makerup.app/uploads/filaments/store.jpg',
    );
    expect(result.message).toContain('Filament2Print');
  });

  it('remove no llama a deleteByUrl si la tienda no tenía logo', async () => {
    const { service, repo, cloudinary } = buildService();
    repo.findOne.mockResolvedValue({ id: 's-2', name: 'Sin logo', imageUrl: null });

    await service.remove('s-2');

    expect(repo.remove).toHaveBeenCalled();
    expect(cloudinary.deleteByUrl).not.toHaveBeenCalled();
  });
});
