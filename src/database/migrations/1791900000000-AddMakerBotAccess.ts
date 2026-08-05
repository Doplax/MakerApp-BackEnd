import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Acceso al chat con MakerBot (petición del cliente, ago-2026): reservado a
 * miembros de la comunidad de Skool. El flag lo concede el ADMIN a mano desde
 * /admin/users; por defecto NADIE lo tiene (default false), así que la tarjeta
 * del bot sale bloqueada con el botón "Hazte miembro".
 *
 * Aditiva e idempotente (`ADD COLUMN IF NOT EXISTS`): corre sola al desplegar.
 */
export class AddMakerBotAccess1791900000000 implements MigrationInterface {
  name = 'AddMakerBotAccess1791900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "makerBotAccess" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "makerBotAccess"`,
    );
  }
}
