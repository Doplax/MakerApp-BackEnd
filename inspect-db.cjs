// Script de SOLO LECTURA: diagnostica el login de doplax en la BD de DATABASE_URL.
require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

(async () => {
  const url = process.env.DATABASE_URL;
  console.log('DB host:', url ? url.split('@')[1] : '(local)');
  const client = new Client({
    connectionString: url,
    ssl: url && url.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  const res = await client.query(
    `SELECT email, password FROM users WHERE email = 'doplax@gmail.com'`,
  );
  await client.end();
  if (!res.rows.length) {
    console.log('doplax NO existe en esta BD');
    return;
  }
  const hash = res.rows[0].password;
  console.log('hash almacenado:', hash ? hash.slice(0, 30) + '…' : '(vacío)');
  console.log("compare('P@ssw0rd'):", await bcrypt.compare('P@ssw0rd', hash));
  console.log("compare('password'):", await bcrypt.compare('password', hash));
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
