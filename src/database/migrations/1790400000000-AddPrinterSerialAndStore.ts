import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `serialNumber` y `storeUrl` en printers: número de serie (lo rellena el maker
 * si quiere) y enlace a la tienda del modelo (viene del catálogo/Excel, botón
 * "Ver en tienda" en la ficha). Aditiva e idempotente — corre sola al desplegar.
 */
export class AddPrinterSerialAndStore1790400000000
  implements MigrationInterface
{
  name = 'AddPrinterSerialAndStore1790400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "printers" ADD COLUMN IF NOT EXISTS "serialNumber" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "printers" ADD COLUMN IF NOT EXISTS "storeUrl" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "printers" DROP COLUMN IF EXISTS "serialNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "printers" DROP COLUMN IF EXISTS "storeUrl"`,
    );
  }
}
