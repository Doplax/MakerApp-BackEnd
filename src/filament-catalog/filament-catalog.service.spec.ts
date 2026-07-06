import { FilamentCatalogService } from './filament-catalog.service';
import { FilamentCatalog } from './entities/filament-catalog.entity';

/**
 * bulkUpsert del catálogo (lo usan el import manual del admin Y el sync
 * automático desde Google Sheets). Fijamos el contrato crítico: es un upsert
 * por brand+material+color, ADITIVO, y una celda vacía (undefined) NUNCA borra
 * un valor ya guardado (precio/enlace/imagen) — antes Object.assign copiaba
 * undefined y machacaba datos en cada re-import.
 */

function makeService(existingRows: Partial<FilamentCatalog>[] = []) {
  const saved: Record<string, unknown>[] = [];
  const repo = {
    findOne: jest.fn(({ where }: { where: Record<string, unknown> }) => {
      const hit = existingRows.find(
        (r) =>
          r.brand === where['brand'] &&
          r.material === where['material'] &&
          r.color === where['color'],
      );
      return Promise.resolve(hit ?? null);
    }),
    create: jest.fn((dto: Record<string, unknown>) => dto),
    save: jest.fn((row: Record<string, unknown>) => {
      saved.push(row);
      return Promise.resolve(row);
    }),
  };
  const cloudinary = { deleteByUrl: jest.fn() };
  const brands = { resolveIdForName: jest.fn().mockResolvedValue(null) };
  const service = new FilamentCatalogService(
    repo as never,
    cloudinary as never,
    brands as never,
  );
  return { service, repo, saved, cloudinary, brands };
}

describe('FilamentCatalogService.bulkUpsert', () => {
  it('crea las filas nuevas y actualiza las existentes (clave brand+material+color)', async () => {
    const existing = {
      brand: 'eSUN',
      material: 'PLA',
      color: 'Rojo',
      referencePrice: 19.99,
    };
    const { service, saved } = makeService([existing]);

    const res = await service.bulkUpsert([
      { brand: 'eSUN', material: 'PLA', color: 'Rojo', referencePrice: 24.99 },
      { brand: 'Sunlu', material: 'PLA', color: 'Azul', referencePrice: 15.5 },
    ] as never);

    expect(res).toEqual({ created: 1, updated: 1, total: 2 });
    expect(saved[0]).toMatchObject({ brand: 'eSUN', referencePrice: 24.99 });
    expect(saved[1]).toMatchObject({ brand: 'Sunlu', color: 'Azul' });
  });

  it('una celda vacía (undefined) NO machaca el valor existente; un valor sí lo actualiza', async () => {
    const existing = {
      brand: 'eSUN',
      material: 'PLA',
      color: 'Rojo',
      referencePrice: 19.99,
      purchaseUrl: 'https://tienda.example.com/rojo',
      imageUrl: 'images/filaments/samples/eSUN-Red-1.jpg',
    };
    const { service, saved } = makeService([existing]);

    await service.bulkUpsert([
      {
        brand: 'eSUN',
        material: 'PLA',
        color: 'Rojo',
        referencePrice: 21.99, // viene con valor → se actualiza
        purchaseUrl: undefined, // celda vacía → se conserva el enlace
        imageUrl: undefined, // el sync nunca manda imagen → se conserva
      },
    ] as never);

    expect(saved[0]).toMatchObject({
      referencePrice: 21.99,
      purchaseUrl: 'https://tienda.example.com/rojo',
      imageUrl: 'images/filaments/samples/eSUN-Red-1.jpg',
    });
  });

  it('al reemplazar imageUrl de una fila existente borra la imagen vieja (contrato de limpieza)', async () => {
    const existing = {
      brand: 'eSUN',
      material: 'PLA',
      color: 'Rojo',
      imageUrl: 'https://api.test/uploads/filaments/old.jpg', // vivía en /uploads
    };
    const { service, cloudinary } = makeService([existing]);

    await service.bulkUpsert([
      {
        brand: 'eSUN',
        material: 'PLA',
        color: 'Rojo',
        imageUrl: 'images/filaments/samples/eSUN-Red-1.jpg', // nueva imagen
      },
    ] as never);

    expect(cloudinary.deleteByUrl).toHaveBeenCalledWith(
      'https://api.test/uploads/filaments/old.jpg',
    );
  });

  it('si imageUrl no cambia, NO borra nada', async () => {
    const existing = {
      brand: 'eSUN',
      material: 'PLA',
      color: 'Rojo',
      imageUrl: 'https://api.test/uploads/filaments/keep.jpg',
    };
    const { service, cloudinary } = makeService([existing]);

    await service.bulkUpsert([
      { brand: 'eSUN', material: 'PLA', color: 'Rojo', referencePrice: 9.99 },
    ] as never);

    expect(cloudinary.deleteByUrl).not.toHaveBeenCalled();
  });
});
