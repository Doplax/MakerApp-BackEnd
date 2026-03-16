import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedModule } from './seed.module.js';
import { SeedService } from './seed.service.js';
import { User } from '../users/entities/user.entity.js';
import { Filament } from '../filaments/entities/filament.entity.js';
import { Printer } from '../printers/entities/printer.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { PrintLog } from '../print-logs/entities/print-log.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'maker_user',
        password: process.env.DB_PASSWORD || 'maker_password',
        database: process.env.DB_NAME || 'maker_db',
        entities: [User, Filament, Printer, Project, PrintLog],
        synchronize: true,
        ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
      }),
    }),
    SeedModule,
  ],
})
class SeedAppModule {}

async function runSeed() {
  const app = await NestFactory.createApplicationContext(SeedAppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const seedService = app.get(SeedService);

  try {
    const result = await seedService.executeSeed();
    console.log('\n✅ Seed completado con éxito:');
    console.table(result.data);
    console.log('\n🔑 Credenciales:');
    for (const cred of result.credentials) {
      console.log(`  [${cred.role}] ${cred.email} / ${cred.password}`);
    }
  } catch (error) {
    console.error('❌ Error ejecutando el seed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

void runSeed();
