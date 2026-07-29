import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ubicación de las tiendas: `latitude`/`longitude` (misma precisión que
 * `users`, decimal 10,7) y `address` (dirección legible). Las tiendas son
 * negocios físicos y se pintan en el mapa de makers con un pin propio.
 *
 * Aditiva e idempotente (`ADD COLUMN IF NOT EXISTS`): la tabla `stores` YA
 * existe en producción (la creó `AddStores1791500000000`), así que NO se
 * recrea ni se tocan sus datos. Corre sola al desplegar (synchronize off).
 */
export class AddStoreLocation1791600000000 implements MigrationInterface {
  name = 'AddStoreLocation1791600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "latitude" numeric(10,7)`,
    );
    await queryRunner.query(
      `ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "longitude" numeric(10,7)`,
    );
    await queryRunner.query(
      `ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "address" character varying(200)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of ['latitude', 'longitude', 'address']) {
      await queryRunner.query(
        `ALTER TABLE "stores" DROP COLUMN IF EXISTS "${col}"`,
      );
    }
  }
}
