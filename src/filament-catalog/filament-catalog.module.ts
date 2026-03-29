import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilamentCatalogService } from './filament-catalog.service.js';
import { FilamentCatalogController } from './filament-catalog.controller.js';
import { FilamentCatalog } from './entities/filament-catalog.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([FilamentCatalog])],
  controllers: [FilamentCatalogController],
  providers: [FilamentCatalogService],
  exports: [FilamentCatalogService],
})
export class FilamentCatalogModule {}
