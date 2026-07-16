import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Accesorios/recambios de impresora (tarjetas curadas con imagen + enlace,
 * emparejadas por marca; se muestran en la ficha de la impresora). Aditiva e
 * idempotente (CREATE TABLE IF NOT EXISTS) — corre sola al desplegar (prod con
 * synchronize off).
 */
export class AddPrinterAccessories1790500000000 implements MigrationInterface {
  name = 'AddPrinterAccessories1790500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "printer_accessories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "kind" character varying(20) NOT NULL DEFAULT 'accessory',
        "name" character varying(120) NOT NULL,
        "description" text,
        "brand" character varying(100),
        "compatibility" character varying(200),
        "url" character varying(500),
        "imageUrl" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_printer_accessories_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "printer_accessories"`);
  }
}
