import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `isAvailable` en users: el maker puede marcarse "Disponible" / "No disponible"
 * desde el dashboard. Se muestra en los mapas (landing y makers-map) y, cuando
 * es false, no se le pueden pedir presupuestos. Aditiva y segura: las filas
 * existentes quedan disponibles (true), el comportamiento de siempre.
 */
export class AddUserAvailability1790300000000 implements MigrationInterface {
  name = 'AddUserAvailability1790300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isAvailable" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "isAvailable"`,
    );
  }
}
