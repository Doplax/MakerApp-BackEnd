import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CloudinaryService } from './cloudinary.service.js';

export interface OrphanScanResult {
  totalFiles: number;
  referenced: number;
  graceHours: number;
  orphans: { relative: string; ageHours: number }[];
}

/**
 * Barredor de ficheros HUÉRFANOS del volumen `/uploads`.
 *
 * Los servicios de cada entidad ya borran su fichero al reemplazarlo o al eliminar
 * la entidad (avatar, logo, imagen/licencia de proyecto, imagen de filamento/impresora/
 * print-log, imagen de catálogo). El único hueco es **subir un fichero y no guardar
 * la entidad** (cancelar el formulario, o reemplazar la imagen antes de guardar): ese
 * fichero queda en el volumen sin fila que lo referencie = BASURA.
 *
 * Este barredor localiza y borra esos huérfanos: lista los ficheros del volumen y los
 * compara con TODAS las columnas de la BD que pueden apuntar a `/uploads`. Solo borra
 * los que NO están referenciados **y** son más antiguos que `graceHours` (evita borrar
 * un fichero recién subido que aún no se ha guardado). Idempotente y no destructivo con
 * los ficheros en uso. Se dispara solo desde admin (dry-run con `scan`, borrado con `sweep`).
 */
@Injectable()
export class StorageSweeperService {
  private readonly logger = new Logger(StorageSweeperService.name);

  /**
   * TODAS las columnas (tabla, columna) que pueden guardar una URL de `/uploads`.
   * ⚠️ Si se añade un flujo de subida nuevo con su columna, AÑÁDELA aquí o el barredor
   * borraría el fichero referenciado por esa columna. (stlFileUrl/purchaseUrl suelen ser
   * URLs externas, pero se incluyen las de fichero por seguridad.)
   */
  private static readonly URL_COLUMNS: readonly [string, string][] = [
    ['users', 'avatarUrl'],
    ['users', 'invoiceLogoUrl'],
    ['projects', 'imageUrl'],
    ['projects', 'licenseFileUrl'],
    ['projects', 'stlFileUrl'],
    ['filaments', 'imageUrl'],
    ['printers', 'imageUrl'],
    ['filament_catalog', 'imageUrl'],
    ['printer_catalog', 'imageUrl'],
    ['filament_offers', 'imageUrl'],
    ['printer_accessories', 'imageUrl'],
    ['print_logs', 'imageUrl'],
  ];

  constructor(
    private readonly dataSource: DataSource,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** Conjunto de rutas relativas (`subfolder/fichero`) referenciadas por la BD. */
  private async referencedRelatives(): Promise<Set<string>> {
    const referenced = new Set<string>();
    for (const [table, column] of StorageSweeperService.URL_COLUMNS) {
      const rows: { url: string | null }[] = await this.dataSource.query(
        `SELECT "${column}" AS url FROM "${table}" WHERE "${column}" LIKE '%/uploads/%'`,
      );
      for (const row of rows) {
        const rel = this.cloudinary.relativeFromUploadsUrl(row.url);
        if (rel) referenced.add(rel);
      }
    }
    return referenced;
  }

  /** Dry-run: devuelve los huérfanos que se borrarían, sin tocar nada. */
  async scan(graceHours = 24, nowMs = Date.now()): Promise<OrphanScanResult> {
    const [referenced, files] = await Promise.all([
      this.referencedRelatives(),
      this.cloudinary.listStoredFiles(),
    ]);
    const orphans: { relative: string; ageHours: number }[] = [];
    for (const file of files) {
      if (referenced.has(file.relative)) continue;
      const ageHours = (nowMs - file.mtimeMs) / 3_600_000;
      if (ageHours >= graceHours) {
        orphans.push({ relative: file.relative, ageHours: Math.round(ageHours) });
      }
    }
    return {
      totalFiles: files.length,
      referenced: referenced.size,
      graceHours,
      orphans,
    };
  }

  /** Borra del volumen los ficheros huérfanos (no referenciados y fuera de gracia). */
  async sweep(
    graceHours = 24,
    nowMs = Date.now(),
  ): Promise<{ scanned: number; deleted: string[] }> {
    const { totalFiles, orphans } = await this.scan(graceHours, nowMs);
    for (const orphan of orphans) {
      await this.cloudinary.deleteByRelative(orphan.relative);
    }
    this.logger.log(
      `Barrido de huérfanos: ${orphans.length} borrados de ${totalFiles} (gracia ${graceHours} h)`,
    );
    return { scanned: totalFiles, deleted: orphans.map((o) => o.relative) };
  }
}
