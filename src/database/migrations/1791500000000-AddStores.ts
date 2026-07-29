import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tiendas donde comprar filamento (tarjetas con enlace externo en la página
 * de Filamentos, curadas por admin). Espejo de `filament_offers`. Aditiva y
 * segura (CREATE TABLE IF NOT EXISTS): no toca datos existentes. Necesaria en
 * producción, donde synchronize está off.
 */
export class AddStores1791500000000 implements MigrationInterface {
  name = 'AddStores1791500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stores" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "description" text,
        "url" character varying(500) NOT NULL,
        "imageUrl" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stores_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "stores"`);
  }
}
