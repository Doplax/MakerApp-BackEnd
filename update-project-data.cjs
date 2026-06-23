// UPDATE NO DESTRUCTIVO: añade precio y descripción enriquecida a los 4
// proyectos de demo ya existentes (match por nombre). No borra ni vacía nada.
require('dotenv').config();
const { Client } = require('pg');

const projects = [
  {
    name: 'Carcasa Raspberry Pi 5',
    price: 12.0,
    description:
      'Carcasa con ventilación para Raspberry Pi 5 con soporte para ventilador de 30 mm. Encaje a presión, sin tornillos.',
  },
  {
    name: 'Organizador de escritorio',
    price: 18.5,
    description:
      'Organizador modular con compartimentos para herramientas, bolígrafos y accesorios. Apilable y personalizable.',
  },
  {
    name: 'Soporte para teléfono',
    price: 8.0,
    description:
      'Soporte articulado para móvil con ajuste de ángulo y base antideslizante. Compatible con la mayoría de modelos.',
  },
  {
    name: 'Maceta autoregante',
    price: 15.0,
    description:
      'Maceta con depósito de agua inferior para riego automático por capilaridad. Ideal para plantas de interior.',
  },
];

(async () => {
  const url = process.env.DATABASE_URL;
  const client = new Client({
    connectionString: url,
    ssl: url && url.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  let updated = 0;
  for (const p of projects) {
    const res = await client.query(
      `UPDATE projects SET price = $1, description = $2 WHERE name = $3`,
      [p.price, p.description, p.name],
    );
    updated += res.rowCount;
    console.log(`${p.name}: ${res.rowCount} fila(s)`);
  }
  await client.end();
  console.log('Total filas actualizadas:', updated);
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
