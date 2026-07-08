import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ofertas de filamento (tarjetas con enlace externo en la página de
 * Filamentos, curadas por admin). Aditiva y segura (CREATE TABLE IF NOT
 * EXISTS): no toca datos existentes. Necesaria en producción, donde
 * synchronize está off.
 */
export class AddFilamentOffers1789000000000 implements MigrationInterface {
  name = 'AddFilamentOffers1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "filament_offers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(120) NOT NULL,
        "brand" character varying(100),
        "description" text,
        "priceText" character varying(100),
        "url" character varying(500) NOT NULL,
        "imageUrl" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_filament_offers_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "filament_offers"`);
  }
}
