import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Soft-delete de notificaciones: columna `deletedAt` para archivar en lugar de
 * borrar, de modo que el histórico de notificaciones sea permanente.
 */
export class NotificationSoftDelete1781716562147 implements MigrationInterface {
  name = 'NotificationSoftDelete1781716562147';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN IF EXISTS "deletedAt"`,
    );
  }
}
