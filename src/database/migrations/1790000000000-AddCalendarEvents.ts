import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Calendario del maker: tareas/eventos (mantenimientos, entregas,
 * recordatorios) con fecha-hora, nota y estado hecho/pendiente, ligados a su
 * maker. Aditiva e idempotente (CREATE TABLE IF NOT EXISTS) — corre sola al
 * arrancar en prod.
 */
export class AddCalendarEvents1790000000000 implements MigrationInterface {
  name = 'AddCalendarEvents1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "calendar_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(150) NOT NULL,
        "notes" text,
        "startsAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "done" boolean NOT NULL DEFAULT false,
        "createdById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_calendar_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_calendar_events_created_by" FOREIGN KEY ("createdById")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "calendar_events"`);
  }
}
