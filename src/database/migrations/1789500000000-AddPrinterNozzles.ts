import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Boquillas disponibles por impresora (multi-selección 0.2/0.4/0.6/0.8/1 en el
 * formulario). Aditiva e idempotente (ADD COLUMN IF NOT EXISTS); el campo
 * legacy `nozzleDiameter` se conserva y el servicio lo sincroniza con la
 * primera de la lista. Backfill: las impresoras con boquilla legacy pasan a
 * tener la lista `[nozzleDiameter]`.
 */
export class AddPrinterNozzles1789500000000 implements MigrationInterface {
  name = 'AddPrinterNozzles1789500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "printers" ADD COLUMN IF NOT EXISTS "nozzleDiameters" jsonb`,
    );
    await queryRunner.query(`
      UPDATE "printers"
      SET "nozzleDiameters" = to_jsonb(ARRAY["nozzleDiameter"])
      WHERE "nozzleDiameters" IS NULL AND "nozzleDiameter" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "printers" DROP COLUMN IF EXISTS "nozzleDiameters"`,
    );
  }
}
