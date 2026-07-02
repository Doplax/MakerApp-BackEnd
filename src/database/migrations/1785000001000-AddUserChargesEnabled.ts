import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `chargesEnabled` en users: refleja el charges_enabled real de Stripe Connect
 * (KYC completado). Aditiva y segura (las filas existentes toman false hasta que
 * se sincronice). Sin esto, el perfil público marcaría "acepta pagos" en cuanto
 * existe la cuenta, aunque el maker no haya terminado el onboarding.
 */
export class AddUserChargesEnabled1785000001000 implements MigrationInterface {
  name = 'AddUserChargesEnabled1785000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "chargesEnabled" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "chargesEnabled"`,
    );
  }
}
