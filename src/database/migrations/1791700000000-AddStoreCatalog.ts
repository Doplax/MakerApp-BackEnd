import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Qué vende cada tienda: `materials` (lista de materiales de filamento —
 * PLA, PETG, ABS, ASA…— que `simple-array` guarda como texto separado por
 * comas) y `sellsPrinters` (si además vende impresoras 3D). Así el maker ve
 * de un vistazo si la tienda tiene lo que busca.
 *
 * Aditiva e idempotente sobre la tabla `stores`, que ya existe en producción.
 */
export class AddStoreCatalog1791700000000 implements MigrationInterface {
  name = 'AddStoreCatalog1791700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "materials" text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "sellsPrinters" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stores" DROP COLUMN IF EXISTS "materials"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stores" DROP COLUMN IF EXISTS "sellsPrinters"`,
    );
  }
}
