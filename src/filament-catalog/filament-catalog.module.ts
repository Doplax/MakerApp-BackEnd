import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilamentCatalogService } from './filament-catalog.service.js';
import { FilamentCatalogController } from './filament-catalog.controller.js';
import { FilamentCatalog } from './entities/filament-catalog.entity.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([FilamentCatalog]), CloudinaryModule],
  controllers: [FilamentCatalogController],
  providers: [FilamentCatalogService],
  exports: [FilamentCatalogService],
})
export class FilamentCatalogModule {}
