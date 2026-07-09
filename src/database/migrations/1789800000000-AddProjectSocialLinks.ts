import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Redes sociales por proyecto (enlace al reel/publicación del proceso de
 * fabricación): Instagram, TikTok y YouTube, todas opcionales. La ficha
 * pública solo pinta los iconos con enlace. Aditiva e idempotente.
 */
export class AddProjectSocialLinks1789800000000 implements MigrationInterface {
  name = 'AddProjectSocialLinks1789800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "instagramUrl" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "tiktokUrl" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "youtubeUrl" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "instagramUrl"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "tiktokUrl"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "youtubeUrl"`);
  }
}
