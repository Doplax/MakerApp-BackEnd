import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Historial de PRESUPUESTOS del maker (documentos informales, separados de
 * las facturas legales): snapshot del cliente e importes en céntimos (IVA
 * por encima de la base). Aditiva e idempotente — corre sola en prod.
 */
export class AddQuotes1790200000000 implements MigrationInterface {
  name = 'AddQuotes1790200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quotes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reference" character varying(30) NOT NULL,
        "concept" character varying(200),
        "clientName" character varying(200),
        "clientNif" character varying(30),
        "clientAddress" character varying(300),
        "notes" text,
        "baseCents" integer NOT NULL,
        "vatPercent" numeric(5,2) NOT NULL DEFAULT '0',
        "vatCents" integer NOT NULL,
        "totalCents" integer NOT NULL,
        "currency" character varying(10) NOT NULL DEFAULT 'eur',
        "createdById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quotes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_quotes_created_by" FOREIGN KEY ("createdById")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "quotes"`);
  }
}
