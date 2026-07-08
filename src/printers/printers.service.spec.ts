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

  it('al crear con nozzleDiameters sincroniza la boquilla legacy con la primera', async () => {
    const { svc, printerRepo } = makeService();
    const user = { id: 'u1', email: 'a@b.c' } as never;

    await svc.create(
      { name: 'X1C', brand: 'Bambu Lab', model: 'X1C', nozzleDiameters: [0.2, 0.6] } as never,
      user,
    );

    expect(printerRepo.create.mock.calls[0][0].nozzleDiameter).toBe(0.2);
  });

  it('las horas iniciales suman al total y al mantenimiento SIN mantenimiento registrado', async () => {
    const { svc, printerRepo } = makeService();
    const user = { id: 'u1' } as never;
    // 120 min impresos en logs = 2 h; 500 h iniciales.
    printerRepo.find.mockResolvedValue([
      {
        id: 'p1',
        initialPrintHours: 500,
        printLogs: [{ printDuration: 120, createdAt: '2026-07-01T00:00:00Z' }],
      },
    ]);

    const [printer] = await svc.findAll(user);

    expect(printer.totalPrintHours).toBe(502);
    expect(printer.hoursSinceSimpleMaintenance).toBe(502);
  });

  it('tras registrar mantenimiento, las horas iniciales ya NO cuentan para ese contador', async () => {
    const { svc, printerRepo } = makeService();
    const user = { id: 'u1' } as never;
    printerRepo.find.mockResolvedValue([
      {
        id: 'p1',
        initialPrintHours: 500,
        lastMaintenanceSimpleAt: '2026-07-02T00:00:00Z',
        printLogs: [
          { printDuration: 120, createdAt: '2026-07-01T00:00:00Z' }, // antes del mant.
          { printDuration: 60, createdAt: '2026-07-03T00:00:00Z' },  // después
        ],
      },
    ]);

    const [printer] = await svc.findAll(user);

    expect(printer.totalPrintHours).toBe(503); // 500 + 3h de logs
    expect(printer.hoursSinceSimpleMaintenance).toBe(1); // solo la de después
  });
});
