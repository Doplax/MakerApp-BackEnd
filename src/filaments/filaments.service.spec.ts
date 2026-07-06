import { FilamentsService } from './filaments.service';

describe('FilamentsService', () => {
  const makeService = () => {
    const filamentRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 'f1', ...x })),
      findBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const catalogRepo = { findOne: jest.fn() };
    const cloudinary = { deleteByUrl: jest.fn() };
    const brands = { resolveIdForName: jest.fn().mockResolvedValue('brand-uuid') };
    const svc = new FilamentsService(
      filamentRepo as never,
      catalogRepo as never,
      cloudinary as never,
      brands as never,
    );
    return { svc, filamentRepo, catalogRepo, brands };
  };

  it('se instancia con sus dependencias mockeadas', () => {
    const { svc } = makeService();
    expect(svc).toBeDefined();
  });

  it('al crear resuelve la marca por nombre y guarda brandId', async () => {
    const { svc, filamentRepo, brands } = makeService();
    const user = { id: 'u1', email: 'a@b.c' } as never;

    await svc.create({ brand: 'Bambu Lab', totalWeight: 1000 } as never, user);

    expect(brands.resolveIdForName).toHaveBeenCalledWith('Bambu Lab');
    const createArg = filamentRepo.create.mock.calls[0][0];
    expect(createArg.brandId).toBe('brand-uuid');
  });

  it('sin nombre de marca no resuelve ni fija brandId', async () => {
    const { svc, filamentRepo, brands } = makeService();
    const user = { id: 'u1', email: 'a@b.c' } as never;

    await svc.create({ totalWeight: 500 } as never, user);

    expect(brands.resolveIdForName).not.toHaveBeenCalled();
    expect(filamentRepo.create.mock.calls[0][0].brandId).toBeUndefined();
  });
});
