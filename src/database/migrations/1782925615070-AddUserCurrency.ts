import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Moneda preferida del usuario (ISO 4217). Aditiva y segura: las filas existentes
 * toman 'EUR' por defecto. Necesaria en producción, donde synchronize está off.
 */
export class AddUserCurrency1782925615070 implements MigrationInterface {
  name = 'AddUserCurrency1782925615070';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "currency" character varying(3) NOT NULL DEFAULT 'EUR'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "currency"`,
    );
  }
}
