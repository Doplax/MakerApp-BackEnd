import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Comparador "Comprar en tienda" del catálogo de filamentos (petición del
 * cliente, ago-2026): un mismo filamento del catálogo puede comprarse en
 * varias tiendas/distribuidores, cada uno con su enlace, precio y valoración
 * (snapshot manual del admin). `filament_catalog.purchaseUrl` sigue siendo el
 * fallback cuando un ítem no tiene opciones.
 *
 * Aditiva e idempotente (`CREATE TABLE IF NOT EXISTS`): corre sola al
 * desplegar. El FK borra en cascada al eliminar el ítem del catálogo.
 */
export class AddCatalogPurchaseOptions1792000000000 implements MigrationInterface {
  name = 'AddCatalogPurchaseOptions1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "catalog_purchase_options" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "catalogId" uuid NOT NULL,
        "vendorName" character varying(120) NOT NULL,
        "vendorLogoUrl" character varying,
        "url" character varying(500) NOT NULL,
        "price" numeric(10,2),
        "rating" numeric(2,1),
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_catalog_purchase_options" PRIMARY KEY ("id"),
        CONSTRAINT "FK_catalog_purchase_options_catalog" FOREIGN KEY ("catalogId")
          REFERENCES "filament_catalog"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_catalog_purchase_options_catalog" ON "catalog_purchase_options" ("catalogId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "catalog_purchase_options"`);
  }
}
