import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Añade el valor 'maker' al enum de rol de usuario (`users_role_enum`). Nueva
 * semántica: `user` = cliente (limitado), `maker` = taller completo, `admin` =
 * admin. Idempotente (`ADD VALUE IF NOT EXISTS`). Va en su PROPIA migración,
 * separada del UPDATE que migra a los usuarios (ver `MigrateUsersToMaker`),
 * porque en algunas versiones de Postgres un valor de enum recién añadido no
 * puede usarse en la misma transacción. Corre sola al desplegar (prod).
 */
export class AddMakerRole1791000000000 implements MigrationInterface {
  name = 'AddMakerRole1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'maker'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres no permite eliminar un valor de un enum → no-op (no destructivo).
  }
}
