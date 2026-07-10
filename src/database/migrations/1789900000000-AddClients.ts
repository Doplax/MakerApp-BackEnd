import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Clientes del maker (mini-CRM para presupuestos): nombre + datos fiscales y
 * de contacto opcionales, siempre ligados a su maker (createdById). Aditiva e
 * idempotente (CREATE TABLE IF NOT EXISTS) — corre sola al arrancar en prod.
 */
export class AddClients1789900000000 implements MigrationInterface {
  name = 'AddClients1789900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(150) NOT NULL,
        "nif" character varying(30),
        "address" character varying(300),
        "email" character varying(150),
        "phone" character varying(30),
        "notes" text,
        "createdById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_clients_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_clients_created_by" FOREIGN KEY ("createdById")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "clients"`);
  }
}
