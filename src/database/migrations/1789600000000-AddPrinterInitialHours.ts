import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Horas de impresión que la máquina ya traía al darla de alta (segunda mano o
 * uso previo). Suman al total calculado desde los print-logs y a los
 * contadores de mantenimiento mientras no haya mantenimiento registrado.
 * Aditiva e idempotente.
 */
export class AddPrinterInitialHours1789600000000 implements MigrationInterface {
  name = 'AddPrinterInitialHours1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "printers" ADD COLUMN IF NOT EXISTS "initialPrintHours" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "printers" DROP COLUMN IF EXISTS "initialPrintHours"`,
    );
  }
}
