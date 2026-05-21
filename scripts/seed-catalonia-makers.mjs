#!/usr/bin/env node
// Crea ~13 makers de demo repartidos por Cataluña usando los endpoints
// públicos del backend (POST /auth/register + PATCH /auth/profile). No toca
// nada de lo existente: si un email ya está registrado, salta ese usuario.
//
// Uso:
//   API_BASE=http://localhost:3000/api node scripts/seed-catalonia-makers.mjs
//   API_BASE=https://api.makerup.app/api node scripts/seed-catalonia-makers.mjs

const API_BASE = process.env.API_BASE ?? 'http://localhost:3000/api';
const DEFAULT_PASSWORD = 'maker123456';

const makers = [
  { fullName: 'Marta Puig',       email: 'marta.puig@example.com',     bio: 'Joyería y complementos impresos en resina. Bambu Lab A1 + Saturn 4 Ultra.',                            location: 'Sabadell, Barcelona',                    latitude: 41.5483, longitude: 2.1075 },
  { fullName: 'Jordi Vilanova',   email: 'jordi.vilanova@example.com', bio: 'Piezas técnicas para drones y FPV. Diseño en Fusion 360 e imprimo en PETG-CF.',                       location: 'Terrassa, Barcelona',                    latitude: 41.5611, longitude: 2.0086 },
  { fullName: 'Núria Soler',      email: 'nuria.soler@example.com',    bio: 'Diseñadora de joyería 3D y figuras coleccionables. Resina + post-procesado artesanal.',              location: 'Girona, España',                         latitude: 41.9831, longitude: 2.8249 },
  { fullName: 'Arnau Costa',      email: 'arnau.costa@example.com',    bio: 'Maker industrial. Prototipos funcionales para empresas químicas del Camp de Tarragona.',             location: 'Tarragona, España',                      latitude: 41.1189, longitude: 1.2445 },
  { fullName: 'Carla Roig',       email: 'carla.roig@example.com',     bio: 'Cosplayer y maker. Armaduras, accesorios y props impresos a tamaño real.',                            location: 'Reus, Tarragona',                        latitude: 41.1561, longitude: 1.1069 },
  { fullName: 'Pep Ferrer',       email: 'pep.ferrer@example.com',     bio: 'Esculturas y arte generativo en 3D. Combino impresión con cerámica y pintura.',                       location: 'Sitges, Barcelona',                      latitude: 41.2371, longitude: 1.8113 },
  { fullName: 'Laia Bosch',       email: 'laia.bosch@example.com',     bio: 'Maker educativo. Imprimo material didáctico para institutos y centros STEAM.',                        location: 'Manresa, Barcelona',                     latitude: 41.7252, longitude: 1.8261 },
  { fullName: 'Roger Pujol',      email: 'roger.pujol@example.com',    bio: 'Piezas agrícolas y de recambio para maquinaria del Segrià. PETG y nylon-CF.',                         location: 'Lleida, España',                         latitude: 41.6177, longitude: 0.62   },
  { fullName: 'Marc Casals',      email: 'marc.casals@example.com',    bio: 'Imprimo repuestos para electrodomésticos y herramientas. Encargos por la zona de Osona.',             location: 'Vic, Barcelona',                         latitude: 41.9301, longitude: 2.2546 },
  { fullName: 'Aina Vidal',       email: 'aina.vidal@example.com',     bio: 'Diseñadora industrial. Producto pequeño en tiradas cortas y prototipos para startups.',               location: 'Mataró, Barcelona',                      latitude: 41.5388, longitude: 2.4448 },
  { fullName: 'Sergi Mas',        email: 'sergi.mas@example.com',      bio: 'Piezas de automoción clásica y restauración. Servicio para talleres del Barcelonès.',                 location: 'Badalona, Barcelona',                    latitude: 41.45,   longitude: 2.2474 },
  { fullName: 'Clara Llopis',     email: 'clara.llopis@example.com',   bio: 'Esculturas naturalistas y réplicas de fauna pirenaica. Trabajo con resina y PLA mate.',               location: 'Olot, Girona',                           latitude: 42.1819, longitude: 2.49   },
  { fullName: 'Oriol Ribas',      email: 'oriol.ribas@example.com',    bio: 'Maker hobbyista. Réplicas de videojuegos y miniaturas para wargaming.',                                location: "Sant Cugat del Vallès, Barcelona",       latitude: 41.4732, longitude: 2.0866 },
];

function unwrap(body) {
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

async function register(maker) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: maker.fullName,
      email: maker.email,
      password: DEFAULT_PASSWORD,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 400 && (body?.message ?? '').toString().toLowerCase().includes('already')) {
    return { skipped: true };
  }
  if (!res.ok) {
    throw new Error(`register ${res.status}: ${JSON.stringify(body)}`);
  }
  return unwrap(body);
}

async function patchProfile(token, payload) {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`patch profile ${res.status}: ${JSON.stringify(body)}`);
  }
  return unwrap(body);
}

async function main() {
  console.log(`API_BASE = ${API_BASE}`);
  let created = 0, skipped = 0, failed = 0;
  for (const maker of makers) {
    try {
      const result = await register(maker);
      if (result.skipped) {
        console.log(`↷ ${maker.fullName} ya existe`);
        skipped++;
        continue;
      }
      const token = result.accessToken;
      if (!token) throw new Error('respuesta sin accessToken');
      await patchProfile(token, {
        bio: maker.bio,
        location: maker.location,
        latitude: maker.latitude,
        longitude: maker.longitude,
      });
      console.log(`✓ ${maker.fullName} — ${maker.location}`);
      created++;
    } catch (err) {
      console.error(`✗ ${maker.fullName}: ${err.message}`);
      failed++;
    }
  }
  console.log(`\nResumen: ${created} creados, ${skipped} ya existían, ${failed} con error`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
