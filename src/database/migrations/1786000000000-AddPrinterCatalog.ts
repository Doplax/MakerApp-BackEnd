import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Catálogo de modelos de impresora (gestionado por admin, consultable por
 * cualquier usuario logueado para autocompletar el alta de impresoras).
 * Aditiva y segura (CREATE TABLE IF NOT EXISTS): no toca datos existentes.
 * Necesaria en producción, donde synchronize está off.
 */
export class AddPrinterCatalog1786000000000 implements MigrationInterface {
  name = 'AddPrinterCatalog1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "printer_catalog" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "brand" character varying(100) NOT NULL,
        "model" character varying(100) NOT NULL,
        "type" character varying(10) NOT NULL DEFAULT 'FDM',
        "buildVolumeX" integer,
        "buildVolumeY" integer,
        "buildVolumeZ" integer,
        "nozzleDiameter" double precision,
        "powerConsumption" integer,
        "referencePrice" numeric(10,2),
        "currency" character varying(3) NOT NULL DEFAULT 'EUR',
        "purchaseUrl" character varying(500),
        "imageUrl" character varying,
        "description" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_printer_catalog_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "printer_catalog"`);
  }
}
