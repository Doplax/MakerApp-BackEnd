import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilamentsService } from './filaments.service.js';
import { FilamentsController } from './filaments.controller.js';
import { Filament } from './entities/filament.entity.js';
import { FilamentCatalog } from '../filament-catalog/entities/filament-catalog.entity.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Filament, FilamentCatalog]),
    CloudinaryModule,
  ],
  controllers: [FilamentsController],
  providers: [FilamentsService],
  exports: [FilamentsService],
})
export class FilamentsModule {}
