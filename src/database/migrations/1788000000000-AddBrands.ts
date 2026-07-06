import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Entidad Marca (`brands`) + relación opcional `brandId` en filamentos, impresoras
 * y sus catálogos. ADITIVA y retrocompatible: la columna de texto `brand` de esas
 * tablas se conserva (display/fallback) y `brandId` es el enlace estructurado que
 * permite gestionar marcas, ver sus productos y filtrar por marca.
 *
 * Backfill: agrupa el texto libre actual por clave normalizada (mismo criterio que
 * BrandsService/resolvePrinterImage: "Bambu Lab"/"Bambulab"/"BambuLab" → una sola
 * marca), crea una fila por grupo (nombre canónico + variantes como alias) y
 * rellena `brandId`. Idempotente (IF NOT EXISTS / ON CONFLICT / WHERE brandId IS NULL).
 */
const BRAND_TABLES = [
  'filaments',
  'filament_catalog',
  'printers',
  'printer_catalog',
] as const;

function normalizeBrand(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/prusa\s*research/g, 'prusa')
    .replace(/bambu\s*lab/g, 'bambulab')
    .replace(/[^a-z0-9]/g, '');
}

export class AddBrands1788000000000 implements MigrationInterface {
  name = 'AddBrands1788000000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS "brands" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "slug" character varying(120) NOT NULL,
        "aliases" jsonb NOT NULL DEFAULT '[]',
        "scope" character varying(20) NOT NULL DEFAULT 'both',
        "logoUrl" character varying,
        "website" character varying(200),
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_brands_id" PRIMARY KEY ("id")
      )
    `);
    await qr.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_brands_name" ON "brands" ("name")`,
    );
    await qr.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_brands_slug" ON "brands" ("slug")`,
    );

    // Columna brandId + FK (SET NULL) en las 4 tablas.
    for (const t of BRAND_TABLES) {
      await qr.query(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "brandId" uuid`);
      await qr.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'FK_${t}_brand'
          ) THEN
            ALTER TABLE "${t}" ADD CONSTRAINT "FK_${t}_brand"
              FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL;
          END IF;
        END $$;
      `);
    }

    // ── Backfill de marcas desde el texto libre existente ──────────────────
    const distinct = new Set<string>();
    for (const t of BRAND_TABLES) {
      const rows: Array<{ brand: string }> = await qr.query(
        `SELECT DISTINCT "brand" FROM "${t}" WHERE "brand" IS NOT NULL AND btrim("brand") <> ''`,
      );
      for (const r of rows) distinct.add(r.brand);
    }
    if (distinct.size === 0) return;

    // Agrupa variantes por clave normalizada.
    const groups = new Map<string, string[]>();
    for (const name of distinct) {
      const key = normalizeBrand(name);
      if (!key) continue;
      const arr = groups.get(key) ?? [];
      arr.push(name);
      groups.set(key, arr);
    }

    // Nombre canónico: preferimos la variante con espacios (nombre "propio") y,
    // en su defecto, la más larga.
    const pickCanonical = (variants: string[]): string =>
      [...variants].sort((a, b) => {
        const sa = /\s/.test(a) ? 1 : 0;
        const sb = /\s/.test(b) ? 1 : 0;
        if (sa !== sb) return sb - sa;
        if (a.length !== b.length) return b.length - a.length;
        return a.localeCompare(b);
      })[0].trim();

    const slugToId = new Map<string, string>();
    for (const [slug, variants] of groups) {
      const name = pickCanonical(variants);
      const aliases = [
        ...new Set(variants.map((v) => v.trim()).filter((v) => v !== name)),
      ];
      const inserted: Array<{ id: string }> = await qr.query(
        `INSERT INTO "brands" ("name","slug","aliases")
         VALUES ($1,$2,$3::jsonb)
         ON CONFLICT ("slug") DO NOTHING
         RETURNING "id"`,
        [name, slug, JSON.stringify(aliases)],
      );
      let id = inserted[0]?.id;
      if (!id) {
        const found: Array<{ id: string }> = await qr.query(
          `SELECT "id" FROM "brands" WHERE "slug" = $1`,
          [slug],
        );
        id = found[0]?.id;
      }
      if (id) slugToId.set(slug, id);
    }

    // Rellena brandId por el valor EXACTO de brand en cada tabla.
    for (const t of BRAND_TABLES) {
      for (const [slug, variants] of groups) {
        const id = slugToId.get(slug);
        if (!id) continue;
        for (const v of variants) {
          await qr.query(
            `UPDATE "${t}" SET "brandId" = $1 WHERE "brand" = $2 AND "brandId" IS NULL`,
            [id, v],
          );
        }
      }
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    for (const t of BRAND_TABLES) {
      await qr.query(`ALTER TABLE "${t}" DROP CONSTRAINT IF EXISTS "FK_${t}_brand"`);
      await qr.query(`ALTER TABLE "${t}" DROP COLUMN IF EXISTS "brandId"`);
    }
    await qr.query(`DROP TABLE IF EXISTS "brands"`);
  }
}
