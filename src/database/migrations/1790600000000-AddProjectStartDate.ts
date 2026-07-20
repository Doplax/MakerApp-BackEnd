import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `startDate` en projects: fecha de inicio del proyecto (cuándo se empezó). Se
 * guarda al crearlo (por defecto hoy) y es editable. Aditiva e idempotente —
 * corre sola al desplegar. No toca los proyectos existentes (quedan con null).
 */
export class AddProjectStartDate1790600000000 implements MigrationInterface {
  name = 'AddProjectStartDate1790600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "startDate" date`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN IF EXISTS "startDate"`,
    );
  }
}
