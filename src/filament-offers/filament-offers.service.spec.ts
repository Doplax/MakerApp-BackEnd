import { NotFoundException } from '@nestjs/common';
import { FilamentOffersService } from './filament-offers.service';
import type { FilamentOffer } from './entities/filament-offer.entity';

describe('FilamentOffersService', () => {
  const buildRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto: Partial<FilamentOffer>) => ({ ...dto })),
    save: jest.fn((entity: Partial<FilamentOffer>) =>
      Promise.resolve({ id: 'generated', ...entity }),
    ),
    remove: jest.fn().mockResolvedValue(undefined),
  });

  const buildService = (
    repo = buildRepo(),
    cloudinary = { deleteByUrl: jest.fn() },
  ) => ({
    service: new FilamentOffersService(repo as never, cloudinary as never),
    repo,
    cloudinary,
  });

  it('findActive solo pide ofertas activas y ordenadas', async () => {
    const { service, repo } = buildService();
    repo.find.mockResolvedValue([]);

    await service.findActive();

    expect(repo.find).toHaveBeenCalledWith({
      where: { isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  });

  it('findAllAdmin devuelve también las inactivas (sin filtro where)', async () => {
    const { service, repo } = buildService();
    repo.find.mockResolvedValue([]);

    await service.findAllAdmin();

    expect(repo.find).toHaveBeenCalledWith({
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  });

  it('findOne lanza NotFoundException si el id no existe', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update borra la imagen anterior de /uploads solo si cambió', async () => {
    const { service, repo, cloudinary } = buildService();
    repo.findOne.mockResolvedValue({
      id: 'o-1',
      title: 'Oferta',
      imageUrl: 'https://api.makerup.app/uploads/filaments/old.jpg',
    });

    await service.update('o-1', {
      imageUrl: 'https://api.makerup.app/uploads/filaments/new.jpg',
    });
    expect(cloudinary.deleteByUrl).toHaveBeenCalledWith(
      'https://api.makerup.app/uploads/filaments/old.jpg',
    );

    // Sin cambio de imagen: no borra nada.
    cloudinary.deleteByUrl.mockClear();
    repo.findOne.mockResolvedValue({
      id: 'o-1',
      title: 'Oferta',
      imageUrl: 'https://api.makerup.app/uploads/filaments/same.jpg',
    });
    await service.update('o-1', { title: 'Oferta editada' });
    expect(cloudinary.deleteByUrl).not.toHaveBeenCalled();
  });

  it('remove elimina la oferta y su imagen del volumen', async () => {
    const { service, repo, cloudinary } = buildService();
    repo.findOne.mockResolvedValue({
      id: 'o-1',
      title: 'Bambu PLA -25%',
      imageUrl: 'https://api.makerup.app/uploads/filaments/offer.jpg',
    });

    const result = await service.remove('o-1');

    expect(repo.remove).toHaveBeenCalled();
    expect(cloudinary.deleteByUrl).toHaveBeenCalledWith(
      'https://api.makerup.app/uploads/filaments/offer.jpg',
    );
    expect(result.message).toContain('Bambu PLA -25%');
  });
});
