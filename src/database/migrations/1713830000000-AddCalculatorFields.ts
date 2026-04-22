import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalculatorFields1713830000000 implements MigrationInterface {
  name = 'AddCalculatorFields1713830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Printer: consumo eléctrico (W)
    await queryRunner.query(
      `ALTER TABLE "printers" ADD COLUMN IF NOT EXISTS "powerConsumption" integer`,
    );

    // PrintLog: coste calculado y desglose persistido
    await queryRunner.query(
      `ALTER TABLE "print_logs" ADD COLUMN IF NOT EXISTS "calculatedCost" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "print_logs" ADD COLUMN IF NOT EXISTS "calculatedPrice" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "print_logs" ADD COLUMN IF NOT EXISTS "costBreakdown" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "print_logs" DROP COLUMN IF EXISTS "costBreakdown"`,
    );
    await queryRunner.query(
      `ALTER TABLE "print_logs" DROP COLUMN IF EXISTS "calculatedPrice"`,
    );
    await queryRunner.query(
      `ALTER TABLE "print_logs" DROP COLUMN IF EXISTS "calculatedCost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "printers" DROP COLUMN IF EXISTS "powerConsumption"`,
    );
  }
}
