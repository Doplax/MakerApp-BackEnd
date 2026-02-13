import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrintLogsService } from './print-logs.service.js';
import { PrintLogsController } from './print-logs.controller.js';
import { PrintLog } from './entities/print-log.entity.js';
import { FilamentsModule } from '../filaments/filaments.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([PrintLog]), FilamentsModule],
  controllers: [PrintLogsController],
  providers: [PrintLogsService],
  exports: [PrintLogsService],
})
export class PrintLogsModule {}
