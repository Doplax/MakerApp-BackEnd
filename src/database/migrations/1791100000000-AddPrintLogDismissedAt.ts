import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Añade `print_logs.dismissedAt`: el "limpiado" del kanban (retirar una
 * impresión completada de la columna "Pendiente envío") pasa de localStorage a
 * persistirse en servidor, para que el tablero y los contadores del dashboard
 * coincidan en todos los dispositivos. Idempotente (`ADD COLUMN IF NOT EXISTS`);
 * corre sola al desplegar (prod). No destructivo: solo añade una columna nula.
 */
export class AddPrintLogDismissedAt1791100000000 implements MigrationInterface {
  name = 'AddPrintLogDismissedAt1791100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "print_logs" ADD COLUMN IF NOT EXISTS "dismissedAt" TIMESTAMP NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "print_logs" DROP COLUMN IF EXISTS "dismissedAt"`,
    );
  }
}
