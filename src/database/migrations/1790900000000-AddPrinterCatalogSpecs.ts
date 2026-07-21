import { MigrationInterface, QueryRunner } from 'typeorm';
import { DEFAULT_PRINTER_CATALOG } from '../../printer-catalog/default-printer-catalog.js';

/**
 * Añade a `printer_catalog` la ficha técnica térmica/velocidad/nº de extrusores
 * (`extruderMaxTemp`, `bedMaxTemp`, `maxSpeed`, `extruderCount`) y BACKFILLEA los
 * modelos predefinidos ya sembrados en prod desde la fuente única
 * `DEFAULT_PRINTER_CATALOG`. Aditiva e idempotente: `ADD COLUMN IF NOT EXISTS` y
 * `UPDATE ... WHERE columna IS NULL` (no pisa valores que ya haya puesto el admin).
 * Corre sola al desplegar (prod con synchronize off).
 */
export class AddPrinterCatalogSpecs1790900000000 implements MigrationInterface {
  name = 'AddPrinterCatalogSpecs1790900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const col of ['extruderMaxTemp', 'bedMaxTemp', 'maxSpeed', 'extruderCount']) {
      await queryRunner.query(
        `ALTER TABLE "printer_catalog" ADD COLUMN IF NOT EXISTS "${col}" integer`,
      );
    }

    // Backfill de los modelos predefinidos (solo columnas aún NULL).
    for (const m of DEFAULT_PRINTER_CATALOG) {
      await queryRunner.query(
        `UPDATE "printer_catalog" SET
           "extruderMaxTemp" = COALESCE("extruderMaxTemp", $1),
           "bedMaxTemp"      = COALESCE("bedMaxTemp", $2),
           "maxSpeed"        = COALESCE("maxSpeed", $3),
           "extruderCount"   = COALESCE("extruderCount", $4)
         WHERE "brand" = $5 AND "model" = $6`,
        [
          m.extruderMaxTemp ?? null,
          m.bedMaxTemp ?? null,
          m.maxSpeed ?? null,
          m.extruderCount ?? null,
          m.brand,
          m.model,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of ['extruderMaxTemp', 'bedMaxTemp', 'maxSpeed', 'extruderCount']) {
      await queryRunner.query(
        `ALTER TABLE "printer_catalog" DROP COLUMN IF EXISTS "${col}"`,
      );
    }
  }
}
