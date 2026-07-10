import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tipo de evento del calendario (mantenimiento/impresión/envío/entrega/
 * recordatorio): icono, color y filtros en el front. Aditiva e idempotente.
 */
export class AddCalendarEventType1790100000000 implements MigrationInterface {
  name = 'AddCalendarEventType1790100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "calendar_events"
      ADD COLUMN IF NOT EXISTS "type" character varying(20) NOT NULL DEFAULT 'reminder'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "type"`,
    );
  }
}
