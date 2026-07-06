import * as XLSX from 'xlsx';
import { CatalogSheetSyncService } from './catalog-sheet-sync.service';
import { FilamentCatalogService } from './filament-catalog.service';

/**
 * Sync del catálogo desde Google Sheets. Fijamos: autenticación del webhook
 * (token en tiempo constante), extracción del id de hoja desde URL, el mapeo de
 * filas (idéntico al import manual: Proveedor→brand, precio "24,99 €"→24.99,
 * purchaseUrl solo si es http, material por pestaña o columna, sin imageUrl) y
 * el coalescing de ráfagas (N pings mientras corre un sync → UN re-sync).
 */

function makeConfig(vars: Record<string, string | undefined>) {
  return { get: jest.fn((k: string) => vars[k]) };
}

function makeCatalogService() {
  return {
    bulkUpsert: jest.fn().mockResolvedValue({ created: 1, updated: 2, total: 3 }),
  };
}

/** Construye un workbook en memoria y lo sirve como respuesta de fetch. */
function mockFetchWithWorkbook(tabs: Array<{ name: string; rows: unknown[][] }>) {
  const wb = XLSX.utils.book_new();
  for (const t of tabs) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(t.rows), t.name);
  }
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    arrayBuffer: async () => Uint8Array.from(buf).buffer,
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function makeService(vars: Record<string, string | undefined>) {
  const config = makeConfig(vars);
  const catalog = makeCatalogService();
  const service = new CatalogSheetSyncService(
    config as never,
    catalog as unknown as FilamentCatalogService,
  );
  return { service, catalog };
}

const VARS = { CATALOG_SHEET_ID: 'sheet123', CATALOG_SYNC_TOKEN: 'secreto' };

describe('CatalogSheetSyncService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('configuración y token', () => {
    it('isConfigured requiere hoja Y token', () => {
      expect(makeService(VARS).service.isConfigured()).toBe(true);
      expect(makeService({ CATALOG_SHEET_ID: 'x' }).service.isConfigured()).toBe(false);
      expect(makeService({ CATALOG_SYNC_TOKEN: 'x' }).service.isConfigured()).toBe(false);
    });

    it('verifyToken acepta el secreto exacto y rechaza el resto', () => {
      const { service } = makeService(VARS);
      expect(service.verifyToken('secreto')).toBe(true);
      expect(service.verifyToken('otro')).toBe(false);
      expect(service.verifyToken(undefined)).toBe(false);
    });

    it('verifyToken rechaza todo si no hay secreto configurado', () => {
      const { service } = makeService({ CATALOG_SHEET_ID: 'x' });
      expect(service.verifyToken('secreto')).toBe(false);
    });
  });

  describe('syncNow: descarga y mapeo', () => {
    it('acepta la URL completa de la hoja y descarga por su id', async () => {
      const fetchMock = mockFetchWithWorkbook([
        { name: 'PLA', rows: [['Color', 'Proveedor'], ['Rojo', 'eSUN']] },
      ]);
      const { service } = makeService({
        ...VARS,
        CATALOG_SHEET_ID: 'https://docs.google.com/spreadsheets/d/abc-DEF_123/edit#gid=0',
      });
      await service.syncNow();
      expect(fetchMock).toHaveBeenCalledWith(
        'https://docs.google.com/spreadsheets/d/abc-DEF_123/export?format=xlsx',
        expect.anything(),
      );
    });

    it('mapea filas como el import manual (brand/precio/link/material por pestaña) y sin imageUrl', async () => {
      mockFetchWithWorkbook([
        {
          name: 'PLA',
          rows: [
            ['Color', 'Proveedor', 'Precio', 'Link a objeto muestra de filamento', 'ID Filamento'],
            ['Rojo', 'eSUN', '24,99 €', 'https://tienda.example.com/rojo', 'eSUN-Red-1'],
            ['Azul', 'Sunlu', '', 'no-es-url', ''],
          ],
        },
        {
          name: 'PETG',
          rows: [
            ['Color', 'Proveedor', 'Precio'],
            ['Gris', 'Bambu Lab', '29.99'],
          ],
        },
      ]);
      const { service, catalog } = makeService(VARS);

      const res = await service.syncNow();

      expect(catalog.bulkUpsert).toHaveBeenCalledTimes(1);
      const items = catalog.bulkUpsert.mock.calls[0][0];
      expect(items).toEqual([
        expect.objectContaining({
          brand: 'eSUN',
          supplier: 'eSUN',
          material: 'PLA',
          color: 'Rojo',
          referencePrice: 24.99,
          purchaseUrl: 'https://tienda.example.com/rojo',
          description: 'ID: eSUN-Red-1',
        }),
        expect.objectContaining({
          brand: 'Sunlu',
          material: 'PLA',
          color: 'Azul',
          referencePrice: undefined,
          purchaseUrl: undefined, // "no-es-url" se descarta
        }),
        expect.objectContaining({
          brand: 'Bambu Lab',
          material: 'PETG',
          color: 'Gris',
          referencePrice: 29.99,
        }),
      ]);
      // El sync NUNCA toca la imagen (el mapeo de muestras vive en el front).
      for (const it of items) expect(it.imageUrl).toBeUndefined();
      expect(res).toEqual({ created: 1, updated: 2, skipped: 0 });
    });

    it('la columna Material por fila manda sobre el nombre de la pestaña', async () => {
      mockFetchWithWorkbook([
        {
          name: 'PLA',
          rows: [
            ['Color', 'Proveedor', 'Material'],
            ['Negro', 'Polymaker', 'ASA'],
          ],
        },
      ]);
      const { service, catalog } = makeService(VARS);
      await service.syncNow();
      expect(catalog.bulkUpsert.mock.calls[0][0][0]).toEqual(
        expect.objectContaining({ material: 'ASA' }),
      );
    });

    it('descarta filas sin color/proveedor o de pestañas sin material resoluble', async () => {
      mockFetchWithWorkbook([
        {
          name: 'Notas', // pestaña que no es un material
          rows: [
            ['Color', 'Proveedor'],
            ['Rojo', 'eSUN'], // sin material resoluble → skipped
          ],
        },
        {
          name: 'PLA',
          rows: [
            ['Color', 'Proveedor'],
            ['', 'eSUN'], // sin color → skipped
            ['Verde', ''], // sin proveedor → skipped
            ['Verde', 'eSUN'], // válida
          ],
        },
      ]);
      const { service, catalog } = makeService(VARS);
      const res = await service.syncNow();
      expect(catalog.bulkUpsert.mock.calls[0][0]).toHaveLength(1);
      expect(res.skipped).toBe(3);
    });

    it('si la descarga falla (hoja no compartida), lanza un error claro y no hace upsert', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 403 }) as unknown as typeof fetch;
      const { service, catalog } = makeService(VARS);
      await expect(service.syncNow()).rejects.toThrow(/No se pudo descargar/);
      expect(catalog.bulkUpsert).not.toHaveBeenCalled();
    });
  });

  describe('requestSync: coalescing de ráfagas', () => {
    it('pings mientras corre un sync → "queued" y UN único re-sync al terminar', async () => {
      const { service } = makeService(VARS);
      // syncNow controlado a mano para simular un sync largo.
      const gates: Array<() => void> = [];
      const syncSpy = jest
        .spyOn(service, 'syncNow')
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              gates.push(() => resolve({ created: 0, updated: 0, skipped: 0 })),
            ),
        );

      expect(service.requestSync()).toEqual({ status: 'started' });
      // Ráfaga: tres pings más mientras el primero sigue corriendo.
      expect(service.requestSync()).toEqual({ status: 'queued' });
      expect(service.requestSync()).toEqual({ status: 'queued' });
      expect(service.requestSync()).toEqual({ status: 'queued' });
      expect(syncSpy).toHaveBeenCalledTimes(1);

      gates[0](); // termina el primer sync
      await new Promise((r) => setTimeout(r, 0));
      // La ráfaga entera se coalesce en UN solo re-sync.
      expect(syncSpy).toHaveBeenCalledTimes(2);

      gates[1]();
      await new Promise((r) => setTimeout(r, 0));
      expect(syncSpy).toHaveBeenCalledTimes(2);

      // Terminado todo, un nuevo ping arranca de cero.
      expect(service.requestSync()).toEqual({ status: 'started' });
    });
  });
});
