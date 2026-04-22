// Aplica la migración AddCalculatorFields directamente vía SQL.
// Uso: node src/database/apply-calculator-migration.mjs
import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const SQL = [
  `ALTER TABLE "printers"   ADD COLUMN IF NOT EXISTS "powerConsumption" integer`,
  `ALTER TABLE "print_logs" ADD COLUMN IF NOT EXISTS "calculatedCost"   numeric(10,2)`,
  `ALTER TABLE "print_logs" ADD COLUMN IF NOT EXISTS "calculatedPrice"  numeric(10,2)`,
  `ALTER TABLE "print_logs" ADD COLUMN IF NOT EXISTS "costBreakdown"    jsonb`,
];

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=') || process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false,
});

try {
  await client.connect();
  for (const q of SQL) {
    process.stdout.write(`> ${q}\n`);
    await client.query(q);
  }
  console.log('OK: columnas añadidas');
} catch (err) {
  console.error('FAIL:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
