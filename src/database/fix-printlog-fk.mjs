/**
 * fix-printlog-fk.mjs
 *
 * Vincula los PrintLogs huérfanos (project_id = NULL) con su proyecto
 * correspondiente buscando coincidencia de nombre + printer.
 *
 * Uso: node src/database/fix-printlog-fk.mjs
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../../.env');

// Cargar .env manualmente
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function main() {
  await client.connect();
  console.log('✓ Conectado a la base de datos\n');

  // 1. Buscar print logs huérfanos (sin projectId pero con printerId)
  const orphans = await client.query(`
    SELECT pl.id, pl.name, pl.status, pl."printerId", pl."createdById"
    FROM print_logs pl
    WHERE pl."projectId" IS NULL
      AND pl."printerId" IS NOT NULL
  `);

  if (!orphans.rows.length) {
    console.log('✓ No hay print logs huérfanos. La base de datos está limpia.');
    await client.end();
    return;
  }

  console.log(`Encontrados ${orphans.rows.length} print log(s) huérfanos:\n`);

  let fixed = 0;
  let skipped = 0;

  for (const log of orphans.rows) {
    // El formato del nombre es: "Impresión: <nombre del proyecto>"
    const projectName = log.name.replace(/^Impresión:\s*/i, '').trim();

    // Buscar proyecto con ese nombre y misma impresora
    const match = await client.query(`
      SELECT p.id, p.name, p."kanbanStatus"
      FROM projects p
      WHERE p.name = $1
        AND p."printerId" = $2
        AND p."createdById" = $3
      LIMIT 1
    `, [projectName, log.printerId, log.createdById]);

    if (match.rows.length) {
      const project = match.rows[0];
      await client.query(`
        UPDATE print_logs SET "projectId" = $1 WHERE id = $2
      `, [project.id, log.id]);
      console.log(`  ✓ "${log.name}" (${log.status}) → proyecto "${project.name}" (${project.kanbanStatus})`);
      fixed++;
    } else {
      // Buscar solo por nombre del proyecto
      const matchByName = await client.query(`
        SELECT p.id, p.name, p."kanbanStatus"
        FROM projects p
        WHERE p.name = $1
          AND p."createdById" = $2
        LIMIT 1
      `, [projectName, log.createdById]);

      if (matchByName.rows.length) {
        const project = matchByName.rows[0];
        await client.query(`
          UPDATE print_logs SET "projectId" = $1 WHERE id = $2
        `, [project.id, log.id]);
        console.log(`  ✓ "${log.name}" (${log.status}) → proyecto "${project.name}" (coincidencia por nombre)`);
        fixed++;
      } else {
        console.log(`  ✗ "${log.name}" → no se encontró proyecto coincidente`);
        skipped++;
      }
    }
  }

  console.log(`\nResumen: ${fixed} corregidos, ${skipped} sin coincidencia`);
  await client.end();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
