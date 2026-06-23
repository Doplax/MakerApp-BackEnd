// UPDATE NO DESTRUCTIVO: rellena el `link` de las notificaciones de doplax que
// estén sin enlace, para que al pulsarlas naveguen al sitio correspondiente.
// No borra ni vacía nada (solo SET link WHERE link IS NULL).
require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const url = process.env.DATABASE_URL;
  const client = new Client({
    connectionString: url,
    ssl: url && url.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  const one = async (sql, params = []) =>
    (await client.query(sql, params)).rows[0];

  const doplax = (await one(`SELECT id FROM users WHERE email = 'doplax@gmail.com'`))?.id;
  const project = (await one(`SELECT id FROM projects LIMIT 1`))?.id;
  const printer = (await one(`SELECT id FROM printers LIMIT 1`))?.id;
  const follower = (await one(`SELECT id FROM users WHERE email <> 'doplax@gmail.com' LIMIT 1`))?.id;
  const conv = (await one(`SELECT id FROM conversations LIMIT 1`))?.id;

  const links = {
    order_confirmed: project ? `/home/projects/${project}` : '/home/finances',
    review_received: '/home/profile',
    follow_received: follower ? `/public/maker/${follower}` : '/home/profile',
    chat_message: conv ? `/home/chat/${conv}` : '/home/chat',
    maintenance_due: printer ? `/home/printers/${printer}` : '/home/printers',
    system: '/home/profile',
  };

  let total = 0;
  for (const [type, link] of Object.entries(links)) {
    const res = await client.query(
      `UPDATE notifications SET link = $1 WHERE "userId" = $2 AND type = $3 AND link IS NULL`,
      [link, doplax, type],
    );
    total += res.rowCount;
    console.log(`${type} -> ${link} (${res.rowCount})`);
  }
  await client.end();
  console.log('Total notificaciones actualizadas:', total);
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
