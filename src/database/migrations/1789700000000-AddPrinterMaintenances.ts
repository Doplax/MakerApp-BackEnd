import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Historial de mantenimientos por impresora: cada "marcar como hecho" guarda
 * fecha, tipo, horas de la máquina (snapshot) y nota opcional. Aditiva e
 * idempotente (CREATE TABLE IF NOT EXISTS).
 */
export class AddPrinterMaintenances1789700000000 implements MigrationInterface {
  name = 'AddPrinterMaintenances1789700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "printer_maintenances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "printerId" uuid NOT NULL,
        "type" character varying(10) NOT NULL,
        "note" text,
        "printerHours" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_printer_maintenances_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_printer_maintenances_printer" FOREIGN KEY ("printerId")
          REFERENCES "printers"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "printer_maintenances"`);
  }
}
