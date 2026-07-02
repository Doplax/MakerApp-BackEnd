import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Facturas persistidas con numeración correlativa. Aditiva y segura
 * (CREATE TABLE IF NOT EXISTS): no toca datos existentes. Necesaria en
 * producción, donde synchronize está off.
 *
 * - `invoices`: factura emitida (número correlativo, snapshots de importes y
 *   partes, enlace opcional a compra/proyecto/comprador).
 * - `invoice_counters`: contador correlativo por maker + serie (año).
 */
export class AddInvoices1785000000000 implements MigrationInterface {
  name = 'AddInvoices1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // uuid_generate_v4() (usado por todas las entidades) requiere uuid-ossp.
    // Idempotente: no falla si ya está creada (el resto del esquema ya la usa).
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "number" character varying(30) NOT NULL,
        "series" character varying(10) NOT NULL,
        "sequence" integer NOT NULL,
        "issueDate" TIMESTAMP NOT NULL,
        "concept" character varying(200),
        "makerName" character varying(200),
        "makerNif" character varying(20),
        "makerAddress" character varying(300),
        "clientName" character varying(200),
        "clientNif" character varying(20),
        "clientAddress" character varying(300),
        "baseCents" integer NOT NULL,
        "vatPercent" numeric(5,2) NOT NULL DEFAULT 0,
        "vatCents" integer NOT NULL,
        "totalCents" integer NOT NULL,
        "currency" character varying(10) NOT NULL DEFAULT 'eur',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "makerId" uuid NOT NULL,
        "buyerId" uuid,
        "purchaseId" uuid,
        "projectId" uuid,
        CONSTRAINT "PK_invoices_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_invoices_maker" FOREIGN KEY ("makerId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invoices_buyer" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_invoices_purchase" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_invoices_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_invoices_maker_number" ON "invoices" ("makerId", "number")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_invoices_purchase" ON "invoices" ("purchaseId")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invoice_counters" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "makerId" uuid NOT NULL,
        "series" character varying(10) NOT NULL,
        "lastNumber" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_invoice_counters_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_invoice_counters_maker_series" UNIQUE ("makerId", "series")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "invoice_counters"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices"`);
  }
}
