import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Notas del taller (pantalla "Notas" tipo Google Keep): título + cuerpo libre
 * (con líneas "[ ] "/"[x] " como checklist), color de tarjeta, fijada y
 * proyecto opcional (SET NULL al borrar el proyecto). Colección independiente
 * de `projects.notes`. Aditiva e idempotente — corre sola en prod; en dev la
 * crea `synchronize`.
 */
export class AddNotes1791300000000 implements MigrationInterface {
  name = 'AddNotes1791300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(150) NOT NULL,
        "content" text NOT NULL DEFAULT '',
        "color" character varying(20) NOT NULL DEFAULT 'purple',
        "pinned" boolean NOT NULL DEFAULT false,
        "projectId" uuid,
        "createdById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notes_project" FOREIGN KEY ("projectId")
          REFERENCES "projects"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_notes_created_by" FOREIGN KEY ("createdById")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notes"`);
  }
}
