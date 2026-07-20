import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `location`, `lot` y `finish` en filaments: ubicación física, nº de lote/colada
 * y acabado (mate/brillo/seda…). Ayudan a los makers a organizar el inventario.
 * Aditiva e idempotente — corre sola al desplegar; no toca los existentes.
 */
export class AddFilamentLocationLotFinish1790700000000
  implements MigrationInterface
{
  name = 'AddFilamentLocationLotFinish1790700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "filaments" ADD COLUMN IF NOT EXISTS "location" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "filaments" ADD COLUMN IF NOT EXISTS "lot" character varying(60)`,
    );
    await queryRunner.query(
      `ALTER TABLE "filaments" ADD COLUMN IF NOT EXISTS "finish" character varying(50)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "filaments" DROP COLUMN IF EXISTS "finish"`);
    await queryRunner.query(`ALTER TABLE "filaments" DROP COLUMN IF EXISTS "lot"`);
    await queryRunner.query(`ALTER TABLE "filaments" DROP COLUMN IF EXISTS "location"`);
  }
}
