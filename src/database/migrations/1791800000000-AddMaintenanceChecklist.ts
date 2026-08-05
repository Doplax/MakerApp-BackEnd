import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Checklist del modal "Registrar mantenimiento" (petición del cliente,
 * ago-2026): cada registro guarda las tareas mostradas y cuáles se marcaron
 * (`[{ label, done }]`, labels ya resueltos en el idioma del maker).
 *
 * Aditiva e idempotente (`ADD COLUMN IF NOT EXISTS`): la tabla
 * `printer_maintenances` ya existe en producción; los registros antiguos
 * quedan con checklist NULL. Corre sola al desplegar (synchronize off).
 */
export class AddMaintenanceChecklist1791800000000 implements MigrationInterface {
  name = 'AddMaintenanceChecklist1791800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "printer_maintenances" ADD COLUMN IF NOT EXISTS "checklist" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "printer_maintenances" DROP COLUMN IF EXISTS "checklist"`,
    );
  }
}
