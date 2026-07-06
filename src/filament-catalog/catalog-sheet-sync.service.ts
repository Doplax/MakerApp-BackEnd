import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import * as XLSX from 'xlsx';
import { FilamentCatalogService } from './filament-catalog.service.js';
import { CreateFilamentCatalogDto } from './dto/create-filament-catalog.dto.js';
import { MaterialType } from '../common/enums/index.js';

/**
 * Sincronización del catálogo de filamentos desde Google Sheets.
 *
 * Flujo: el cliente edita la hoja → un Apps Script en la hoja hace un ping a
 * `POST /filament-catalog/sync` (con `x-sync-token`) → este servicio SE TRAE la
 * hoja (export .xlsx público de solo-lectura) → parsea con el MISMO mapeo que el
 * import manual de admin → `bulkUpsert` (aditivo; las celdas vacías NO machacan
 * valores existentes). Ver docs/SYNC-CATALOGO-SHEETS.md.
 *
 * Config (env):
 *  - CATALOG_SHEET_ID    id (o URL completa) de la hoja de Google. La hoja debe
 *                        ser visible con enlace ("cualquiera con el enlace: lector").
 *  - CATALOG_SYNC_TOKEN  secreto compartido con el Apps Script.
 *
 * Diferencia con el import manual: aquí NO se calcula imageUrl (ese mapeo usa
 * los estáticos del front). Al no venir, el upsert conserva la imagen existente
 * y las filas nuevas quedan sin imagen (el front pinta la bobina por color).
 */
@Injectable()
export class CatalogSheetSyncService {
  private readonly logger = new Logger(CatalogSheetSyncService.name);

  // Coalescing anti-ráfagas: los onEdit del Sheet pueden llegar en tropel. Si ya
  // hay un sync corriendo, apuntamos "hay más cambios" y se re-ejecuta UNA vez al
  // terminar (el último estado de la hoja siempre queda recogido).
  private syncing = false;
  private rerunQueued = false;

  /** Resultado del último sync (diagnóstico). */
  lastResult: {
    at: Date;
    ok: boolean;
    created?: number;
    updated?: number;
    skipped?: number;
    error?: string;
  } | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly catalogService: FilamentCatalogService,
  ) {}

  /** true si hay hoja y token configurados (si no, el endpoint responde 503). */
  isConfigured(): boolean {
    return !!this.sheetId() && !!this.config.get<string>('CATALOG_SYNC_TOKEN');
  }

  /** Comparación en tiempo constante del token del webhook. */
  verifyToken(token: string | undefined): boolean {
    const secret = this.config.get<string>('CATALOG_SYNC_TOKEN');
    if (!secret || !token) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(secret);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /** Acepta el id a pelo o la URL completa de la hoja (extrae el /d/<id>/). */
  private sheetId(): string | null {
    const raw = this.config.get<string>('CATALOG_SHEET_ID')?.trim();
    if (!raw) return null;
    const fromUrl = /\/d\/([a-zA-Z0-9-_]+)/.exec(raw);
    return fromUrl ? fromUrl[1] : raw;
  }

  /**
   * Punto de entrada del webhook: dispara el sync en segundo plano y responde ya
   * (el Apps Script no debe quedarse esperando). Coalesce ráfagas de ediciones.
   */
  requestSync(): { status: 'started' | 'queued' } {
    if (this.syncing) {
      this.rerunQueued = true;
      return { status: 'queued' };
    }
    this.syncing = true;
    void this.runLoop();
    return { status: 'started' };
  }

  private async runLoop(): Promise<void> {
    try {
      do {
        this.rerunQueued = false;
        try {
          await this.syncNow();
        } catch (e) {
          const msg = (e as Error)?.message ?? String(e);
          this.lastResult = { at: new Date(), ok: false, error: msg };
          this.logger.error(`Sync del catálogo desde Sheets FALLÓ: ${msg}`);
        }
      } while (this.rerunQueued);
    } finally {
      this.syncing = false;
    }
  }

  /** Descarga la hoja, la parsea y hace el upsert. */
  async syncNow(): Promise<{ created: number; updated: number; skipped: number }> {
    const id = this.sheetId();
    if (!id) throw new Error('CATALOG_SHEET_ID no configurado');

    const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      throw new Error(
        `No se pudo descargar la hoja (HTTP ${res.status}). ¿Está compartida como "cualquiera con el enlace: lector"?`,
      );
    }
    const buf = Buffer.from(await res.arrayBuffer());

    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buf, { type: 'buffer' });
    } catch {
      // Si la hoja no es pública, Google devuelve una página HTML de login.
      throw new Error(
        'La respuesta no es un excel válido. ¿Está la hoja compartida como "cualquiera con el enlace: lector"?',
      );
    }

    const { items, skipped } = this.parseWorkbook(wb);
    if (items.length === 0) {
      this.lastResult = { at: new Date(), ok: true, created: 0, updated: 0, skipped };
      this.logger.warn(`Sync Sheets: 0 filas válidas (${skipped} descartadas)`);
      return { created: 0, updated: 0, skipped };
    }

    const { created, updated } = await this.catalogService.bulkUpsert(items);
    this.lastResult = { at: new Date(), ok: true, created, updated, skipped };
    this.logger.log(
      `Sync Sheets OK: ${created} creados, ${updated} actualizados, ${skipped} filas descartadas`,
    );
    return { created, updated, skipped };
  }

  /**
   * Mismo mapeo que el import manual del admin (filament-import.component.ts):
   * cada pestaña aporta su material por el nombre (PLA/PETG/…); columnas
   * Color / Proveedor(→brand+supplier) / Precio / Link…(→purchaseUrl si es http)
   * / Material por fila (opcional, manda sobre la pestaña) / ID Filamento
   * (→description "ID: …"). Filas sin color o proveedor se descartan.
   */
  private parseWorkbook(wb: XLSX.WorkBook): {
    items: CreateFilamentCatalogDto[];
    skipped: number;
  } {
    const materials = Object.values(MaterialType) as string[];
    const items: CreateFilamentCatalogDto[] = [];
    let skipped = 0;

    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
        defval: '',
        raw: false,
      });
      const tab = sheetName.trim().toUpperCase();
      const sheetMaterial = materials.includes(tab) ? tab : undefined;

      for (const r of raw) {
        const pick = (...keys: string[]): string => {
          for (const k of keys) {
            const found = Object.keys(r).find(
              (rk) => rk.trim().toLowerCase() === k.toLowerCase(),
            );
            if (found && r[found] !== '' && r[found] != null) {
              return String(r[found]).trim();
            }
          }
          return '';
        };

        const color = pick('Color');
        const supplier = pick('Proveedor', 'Supplier');
        // Fila totalmente vacía (relleno del sheet_to_json): ni la contamos.
        if (!color && !supplier) continue;

        const materialRaw = pick('Material', 'Tipo material', 'Tipo de material', 'Material Type')
          .trim()
          .toUpperCase();
        const material = materials.includes(materialRaw) ? materialRaw : sheetMaterial;

        // Sin color, sin proveedor o sin material resoluble → descartada.
        if (!color || !supplier || !material) {
          skipped++;
          continue;
        }

        const priceRaw = pick('Precio', 'Price');
        const externalId = pick('ID Filamento', 'ID');
        const purchaseUrl = pick(
          'Link a objeto muestra de filamento',
          'Link a objeto muestra',
          'Link al filamento',
          'Link de compra',
          'Link compra',
          'Link',
          'URL',
          'Enlace',
          'Enlace compra',
          'Purchase link',
          'Purchase URL',
        );

        items.push({
          brand: supplier,
          material: material as MaterialType,
          color,
          supplier,
          referencePrice: this.parsePrice(priceRaw),
          purchaseUrl: /^https?:\/\//i.test(purchaseUrl) ? purchaseUrl : undefined,
          description: externalId ? `ID: ${externalId}` : undefined,
          // imageUrl NUNCA se toca desde el sync (ver doc de la clase).
        });
      }
    }

    return { items, skipped };
  }

  /** "24,99 €" → 24.99 (igual que el import del front). */
  private parsePrice(raw: string): number | undefined {
    if (!raw) return undefined;
    const cleaned = raw.replace(/[^\d,.-]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? undefined : n;
  }
}
