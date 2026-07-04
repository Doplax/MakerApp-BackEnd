import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Añade `attachment` (jsonb) a `messages`: snapshot opcional de una referencia
 * a proyecto (p. ej. el producto del que se habla al "Pedir presupuesto").
 * Aditiva e idempotente: las filas existentes toman NULL (sin adjunto).
 */
export class AddMessageAttachment1787000000000 implements MigrationInterface {
  name = 'AddMessageAttachment1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "attachment" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" DROP COLUMN IF EXISTS "attachment"`,
    );
  }
}
