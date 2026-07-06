import { PrintersService } from './printers.service';

describe('PrintersService', () => {
  const makeService = () => {
    const printerRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 'p1', ...x })),
    };
    const cloudinary = { deleteByUrl: jest.fn() };
    const brands = { resolveIdForName: jest.fn().mockResolvedValue('brand-uuid') };
    const svc = new PrintersService(
      printerRepo as never,
      cloudinary as never,
      brands as never,
    );
    return { svc, printerRepo, brands };
  };

  it('se instancia con sus dependencias mockeadas', () => {
    const { svc } = makeService();
    expect(svc).toBeDefined();
  });

  it('al crear resuelve la marca por nombre y guarda brandId', async () => {
    const { svc, printerRepo, brands } = makeService();
    const user = { id: 'u1', email: 'a@b.c' } as never;

    await svc.create({ name: 'Mi MK4', brand: 'Prusa', model: 'MK4S' } as never, user);

    expect(brands.resolveIdForName).toHaveBeenCalledWith('Prusa');
    expect(printerRepo.create.mock.calls[0][0].brandId).toBe('brand-uuid');
  });
});
