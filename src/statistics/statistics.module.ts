import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsService } from './statistics.service.js';
import { StatisticsController } from './statistics.controller.js';
import { Filament } from '../filaments/entities/filament.entity.js';
import { PrintLog } from '../print-logs/entities/print-log.entity.js';
import { Printer } from '../printers/entities/printer.entity.js';
import { Project } from '../projects/entities/project.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Filament, PrintLog, Printer, Project])],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
