import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Siembra la colección `notes` con el texto que los makers ya tenían en
 * `projects.notes` (el campo "Notas adicionales" del formulario de proyecto).
 *
 * Motivo: el botón de notas de un proyecto ya no abre un popup con ese texto,
 * sino la pantalla de Notas filtrada por ese proyecto. Sin este volcado, un
 * proyecto con notas antiguas llevaría a una pantalla vacía.
 *
 * ADITIVA Y NO DESTRUCTIVA: crea una nota por proyecto con texto y **no toca**
 * `projects.notes` (el campo sigue existiendo y editándose como hasta ahora).
 * Idempotente: el `NOT EXISTS` evita duplicar si la migración se repite.
 */
export class SeedNotesFromProjectNotes1791400000000
  implements MigrationInterface
{
  name = 'SeedNotesFromProjectNotes1791400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "notes" ("title", "content", "color", "pinned", "projectId", "createdById")
      SELECT
        LEFT(p."name", 150),
        p."notes",
        'purple',
        false,
        p."id",
        p."createdById"
      FROM "projects" p
      WHERE p."notes" IS NOT NULL
        AND btrim(p."notes") <> ''
        AND p."createdById" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "notes" n
          WHERE n."projectId" = p."id" AND n."content" = p."notes"
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Borra solo las notas idénticas al texto del proyecto que las originó
    // (las escritas a mano después no coinciden y se conservan).
    await queryRunner.query(`
      DELETE FROM "notes" n
      USING "projects" p
      WHERE n."projectId" = p."id" AND n."content" = p."notes"
    `);
  }
}
