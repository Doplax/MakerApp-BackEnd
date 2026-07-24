import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Añade `users.googleEmail` (email de la cuenta de Google vinculada, para
 * mostrar "Vinculada con X" en Ajustes) y lo backfillea para los usuarios que
 * ya tienen `googleId`: hasta ahora la vinculación solo podía producirse por
 * coincidencia de email, así que su email de Google ES el de la cuenta.
 * Idempotente y aditiva; corre sola al desplegar (prod).
 */
export class AddGoogleEmail1791200000000 implements MigrationInterface {
  name = 'AddGoogleEmail1791200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleEmail" VARCHAR NULL`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "googleEmail" = email WHERE "googleId" IS NOT NULL AND "googleEmail" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "googleEmail"`,
    );
  }
}
