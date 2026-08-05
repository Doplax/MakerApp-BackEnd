import { PurchaseOptionsService } from './purchase-options.service';
import { CatalogPurchaseOption } from './entities/catalog-purchase-option.entity';

/**
 * El comparador "Comprar en tienda" vive o muere por el ORDEN (mejor precio
 * primero) y por el contrato de limpieza del logo en /uploads. Estos tests
 * fijan ambos.
 */
describe('PurchaseOptionsService', () => {
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let cloudinary: { deleteByUrl: jest.Mock };
  let svc: PurchaseOptionsService;

  const option = (over: Partial<CatalogPurchaseOption>): CatalogPurchaseOption =>
    ({
      id: 'o1',
      catalogId: 'c1',
      vendorName: 'GCode28',
      vendorLogoUrl: null,
      url: 'https://tienda.example/x',
      price: null,
      rating: null,
      isActive: true,
      sortOrder: 0,
      ...over,
    }) as CatalogPurchaseOption;

  beforeEach(() => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      remove: jest.fn(),
    };
    cloudinary = { deleteByUrl: jest.fn() };
    svc = new PurchaseOptionsService(repo as never, cloudinary as never);
  });

  it('findActiveForItem ordena por mejor precio (los sin precio, al final)', async () => {
    repo.find.mockResolvedValue([
      option({ id: 'caro', price: '23.50' }),
      option({ id: 'sin-precio', price: null }),
      option({ id: 'barato', price: '21.99' }),
    ]);

    const result = await svc.findActiveForItem('c1');

    expect(repo.find).toHaveBeenCalledWith({
      where: { catalogId: 'c1', isActive: true },
    });
    expect(result.map((o) => o.id)).toEqual(['barato', 'caro', 'sin-precio']);
  });

  it('sortOrder manda sobre el precio (desempate manual del admin)', async () => {
    repo.find.mockResolvedValue([
      option({ id: 'destacado-caro', price: '25.00', sortOrder: 0 }),
      option({ id: 'barato-normal', price: '19.99', sortOrder: 1 }),
    ]);

    const result = await svc.findActiveForItem('c1');
    expect(result.map((o) => o.id)).toEqual(['destacado-caro', 'barato-normal']);
  });

  it('al reemplazar el logo borra el fichero antiguo del volumen', async () => {
    repo.findOne.mockResolvedValue(
      option({ vendorLogoUrl: 'https://api/uploads/filaments/logo-old.png' }),
    );

    await svc.update('o1', {
      vendorLogoUrl: 'https://api/uploads/filaments/logo-new.png',
    });

    expect(cloudinary.deleteByUrl).toHaveBeenCalledWith(
      'https://api/uploads/filaments/logo-old.png',
    );
  });

  it('al eliminar la opción borra también su logo', async () => {
    repo.findOne.mockResolvedValue(
      option({ vendorLogoUrl: 'https://api/uploads/filaments/logo.png' }),
    );

    await svc.remove('o1');

    expect(repo.remove).toHaveBeenCalled();
    expect(cloudinary.deleteByUrl).toHaveBeenCalledWith(
      'https://api/uploads/filaments/logo.png',
    );
  });
});
