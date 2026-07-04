import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env desde el cwd. Los scripts npm de migración corren en Back/, así que esto
// carga Back/.env tanto si se ejecuta el .ts (ts-node) como el .js compilado (dist).
dotenv.config();

// Selección de BD por entorno (ver context/database.md). Inline (sin import) porque
// este fichero lo ejecuta la CLI de TypeORM con typeorm-ts-node-commonjs.
// PRODUCCIÓN (EasyPanel) = DATABASE_URL; DESARROLLO (Neon) = DATABASE_URL_DEV.
const isProd = process.env.NODE_ENV === 'production';
const databaseUrl =
  !isProd && process.env.DATABASE_URL_DEV
    ? process.env.DATABASE_URL_DEV
    : process.env.DATABASE_URL;

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'maker_user',
  password: process.env.DB_PASSWORD || 'maker_password',
  database: process.env.DB_NAME || 'maker_db',
  // SSL según la URL resuelta: EasyPanel (prod) sin SSL; Neon (dev) con SSL.
  ssl:
    process.env.DB_SSL === 'true' || databaseUrl?.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
  entities: [path.resolve(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.resolve(__dirname, './migrations/*{.ts,.js}')],
  synchronize: false,
  logging: false,
});
