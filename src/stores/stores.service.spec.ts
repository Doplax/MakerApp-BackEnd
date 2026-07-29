import { NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
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

  it('create persiste la ubicación del negocio (lat/lng/dirección)', async () => {
    const { service, repo } = buildService();

    const created = await service.create({
      name: 'Tienda 3D Barcelona',
      url: 'https://tienda3d.example',
      latitude: 41.3874,
      longitude: 2.1686,
      address: 'Carrer de Mallorca 1, Barcelona',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 41.3874,
        longitude: 2.1686,
        address: 'Carrer de Mallorca 1, Barcelona',
      }),
    );
    expect(created.latitude).toBe(41.3874);
    expect(created.longitude).toBe(2.1686);
    expect(created.address).toBe('Carrer de Mallorca 1, Barcelona');
  });

  it('update mueve la tienda en el mapa y permite limpiar su ubicación', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue({
      id: 's-1',
      name: 'Tienda',
      url: 'https://tienda.com',
      imageUrl: null,
      latitude: 41.3874,
      longitude: 2.1686,
      address: 'Barcelona',
    });

    const moved = await service.update('s-1', {
      latitude: 40.4168,
      longitude: -3.7038,
      address: 'Madrid',
    });
    expect(moved.latitude).toBe(40.4168);
    expect(moved.longitude).toBe(-3.7038);
    expect(moved.address).toBe('Madrid');

    // null = quitar del mapa (el DTO lo acepta con @IsOptional).
    repo.findOne.mockResolvedValue({
      id: 's-1',
      name: 'Tienda',
      latitude: 40.4168,
      longitude: -3.7038,
      address: 'Madrid',
      imageUrl: null,
    });
    const cleared = await service.update('s-1', {
      latitude: null,
      longitude: null,
      address: null,
    });
    expect(cleared.latitude).toBeNull();
    expect(cleared.longitude).toBeNull();
    expect(cleared.address).toBeNull();
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

  // ── Validación del DTO: la ubicación es lo que sitúa la tienda en el mapa,
  // así que unas coordenadas fuera de rango deben rechazarse en el borde.
  describe('CreateStoreDto (ubicación)', () => {
    const errorsFor = (payload: Record<string, unknown>) =>
      validateSync(plainToInstance(CreateStoreDto, payload))
        .map((e) => e.property)
        .sort();

    const base = { name: 'Tienda', url: 'https://tienda.com' };

    it('acepta coordenadas válidas y dirección', () => {
      expect(
        errorsFor({
          ...base,
          latitude: 41.3874,
          longitude: 2.1686,
          address: 'Barcelona',
        }),
      ).toEqual([]);
    });

    it('acepta una tienda sin ubicación (campos opcionales)', () => {
      expect(errorsFor(base)).toEqual([]);
    });

    it('rechaza latitud fuera de -90..90 y longitud fuera de -180..180', () => {
      expect(errorsFor({ ...base, latitude: 91 })).toEqual(['latitude']);
      expect(errorsFor({ ...base, latitude: -91 })).toEqual(['latitude']);
      expect(errorsFor({ ...base, longitude: 181 })).toEqual(['longitude']);
      expect(errorsFor({ ...base, longitude: -181 })).toEqual(['longitude']);
    });

    it('rechaza coordenadas no numéricas', () => {
      expect(
        errorsFor({ ...base, latitude: 'aquí', longitude: 'allí' }),
      ).toEqual(['latitude', 'longitude']);
    });
  });
});
