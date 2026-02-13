import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service.js';
import { SeedController } from './seed.controller.js';
import { User } from '../users/entities/user.entity.js';
import { Filament } from '../filaments/entities/filament.entity.js';
import { Printer } from '../printers/entities/printer.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { PrintLog } from '../print-logs/entities/print-log.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Filament, Printer, Project, PrintLog]),
  ],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
