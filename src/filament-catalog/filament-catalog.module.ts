import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilamentCatalogService } from './filament-catalog.service.js';
import { FilamentCatalogController } from './filament-catalog.controller.js';
import { CatalogSheetSyncService } from './catalog-sheet-sync.service.js';
import { CatalogSheetSyncController } from './catalog-sheet-sync.controller.js';
import { FilamentCatalog } from './entities/filament-catalog.entity.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';
import { BrandsModule } from '../brands/brands.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([FilamentCatalog]),
    CloudinaryModule,
    BrandsModule,
  ],
  controllers: [FilamentCatalogController, CatalogSheetSyncController],
  providers: [FilamentCatalogService, CatalogSheetSyncService],
  exports: [FilamentCatalogService],
})
export class FilamentCatalogModule {}
