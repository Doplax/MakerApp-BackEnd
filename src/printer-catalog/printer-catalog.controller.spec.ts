import { PrinterCatalogController } from './printer-catalog.controller';
import type { PrinterCatalogService } from './printer-catalog.service';

describe('PrinterCatalogController', () => {
  const buildController = () => {
    const service = {
      create: jest.fn().mockResolvedValue({ id: 'c1' }),
      bulkUpsert: jest.fn().mockResolvedValue({ created: 1, updated: 0, total: 1 }),
      findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      findAllAdmin: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      findOne: jest.fn().mockResolvedValue({ id: 'c1' }),
      update: jest.fn().mockResolvedValue({ id: 'c1' }),
      remove: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    return {
      controller: new PrinterCatalogController(
        service as unknown as PrinterCatalogService,
      ),
      service,
    };
  };

  it('delega create() en el servicio', () => {
    const { controller, service } = buildController();
    const dto = { brand: 'Prusa', model: 'MK4s' } as never;
    void controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('bulkUpsert() pasa los items del body (o lista vacía)', () => {
    const { controller, service } = buildController();
    const items = [{ brand: 'Prusa', model: 'MK4s' }] as never[];
    void controller.bulkUpsert({ items } as never);
    expect(service.bulkUpsert).toHaveBeenCalledWith(items);

    void controller.bulkUpsert({} as never);
    expect(service.bulkUpsert).toHaveBeenLastCalledWith([]);
  });

  it('findAll() usa el listado público y findAllAdmin() el de admin', () => {
    const { controller, service } = buildController();
    const filter = { search: 'prusa' } as never;
    void controller.findAll(filter);
    expect(service.findAll).toHaveBeenCalledWith(filter);
    void controller.findAllAdmin(filter);
    expect(service.findAllAdmin).toHaveBeenCalledWith(filter);
  });

  it('delega update() y remove() con el id', () => {
    const { controller, service } = buildController();
    const dto = { isActive: false } as never;
    void controller.update('c1', dto);
    expect(service.update).toHaveBeenCalledWith('c1', dto);
    void controller.remove('c1');
    expect(service.remove).toHaveBeenCalledWith('c1');
  });
});
