import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migra a los usuarios EXISTENTES al rol `maker`: hasta ahora todos los
 * registrados eran `user` y tenían taller completo, así que al introducir la
 * nueva semántica (`user` = cliente) hay que reconvertirlos a `maker` para que
 * NO pierdan su taller. Los `admin` no se tocan. Aditiva e idempotente (tras
 * correr no quedan `user` que reconvertir; los clientes que se registren después
 * ya nacen con su rol). Corre sola al desplegar (prod).
 *
 * ⚠️ El `down` es no-op a propósito: revertir maker→user degradaría a clientes a
 * los makers reales (destructivo) y no se puede distinguir cuáles nacieron como
 * cliente después. No revertir automáticamente.
 */
export class MigrateUsersToMaker1791000100000 implements MigrationInterface {
  name = 'MigrateUsersToMaker1791000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Acotado por fecha de alta: solo los usuarios ANTERIORES al cambio de
    // semántica (2026-07-21) eran makers con rol 'user'. Si esta migración se
    // re-ejecutara en el futuro sobre una BD restaurada de un dump (sin tabla
    // `migrations`), sin este límite promocionaría en masa a los CLIENTES
    // reales registrados después. En prod ya corrió; esto la deja inocua.
    await queryRunner.query(
      `UPDATE "users" SET "role" = 'maker'
       WHERE "role" = 'user' AND "createdAt" < '2026-07-21T12:00:00Z'`,
    );
  }

  public async down(): Promise<void> {
    // No-op intencional (ver cabecera): no degradar makers a cliente.
  }
}
