import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'maker_user',
  password: process.env.DB_PASSWORD || 'maker_password',
  database: process.env.DB_NAME || 'maker_db',
  // SSL condicional: activo solo si DB_SSL=true o la URL pide sslmode=require.
  ssl:
    process.env.DB_SSL === 'true' ||
    process.env.DATABASE_URL?.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
  entities: [path.resolve(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.resolve(__dirname, './migrations/*{.ts,.js}')],
  synchronize: false,
  logging: false,
});
