// Backup de SOLO LECTURA: vuelca todas las tablas de DATABASE_URL a un JSON.
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

(async () => {
  const url = process.env.DATABASE_URL;
  const client = new Client({
    connectionString: url,
    ssl: url && url.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  const tables = (
    await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    )
  ).rows.map((r) => r.tablename);
  const dump = {};
  for (const t of tables) {
    dump[t] = (await client.query(`SELECT * FROM "${t}"`)).rows;
  }
  await client.end();
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = `backup-neon-${ts}.json`;
  fs.writeFileSync(file, JSON.stringify(dump, null, 2));
  console.log('Backup escrito en:', file);
  console.log(
    'Tablas:',
    tables.map((t) => `${t}(${dump[t].length})`).join(', '),
  );
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
