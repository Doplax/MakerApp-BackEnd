import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { FilamentsModule } from './filaments/filaments.module.js';
import { PrintersModule } from './printers/printers.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { PrintLogsModule } from './print-logs/print-logs.module.js';
import { StatisticsModule } from './statistics/statistics.module.js';
import { SeedModule } from './seed/seed.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'maker_user',
      password: process.env.DB_PASSWORD || 'maker_password',
      database: process.env.DB_NAME || 'maker_db',
      autoLoadEntities: true,
      synchronize: true, // Solo para desarrollo, desactivar en producción
    }),
    UsersModule,
    AuthModule,
    FilamentsModule,
    PrintersModule,
    ProjectsModule,
    PrintLogsModule,
    StatisticsModule,
    SeedModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
