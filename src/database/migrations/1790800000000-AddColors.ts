import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabla `colors`: registro único de colores de filamento (nombre + swatch CSS)
 * servido por `GET /colors`. Aditiva e idempotente (CREATE TABLE IF NOT EXISTS)
 * — corre sola al desplegar (prod con synchronize off). La SIEMBRA del set base
 * NO va aquí: la hace `ColorsService.onModuleInit` (idempotente por nombre), que
 * corre tanto en dev (synchronize) como en prod tras las migraciones.
 */
export class AddColors1790800000000 implements MigrationInterface {
  name = 'AddColors1790800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "colors" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(60) NOT NULL,
        "swatch" character varying(200) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_colors_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_colors_name" ON "colors" ("name")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "colors"`);
  }
}
