import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilamentsService } from './filaments.service.js';
import { FilamentsController } from './filaments.controller.js';
import { Filament } from './entities/filament.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Filament])],
  controllers: [FilamentsController],
  providers: [FilamentsService],
  exports: [FilamentsService],
})
export class FilamentsModule {}
