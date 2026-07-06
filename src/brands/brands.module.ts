import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandsService } from './brands.service.js';
import { BrandsController } from './brands.controller.js';
import { Brand } from './entities/brand.entity.js';
import { Filament } from '../filaments/entities/filament.entity.js';
import { FilamentCatalog } from '../filament-catalog/entities/filament-catalog.entity.js';
import { Printer } from '../printers/entities/printer.entity.js';
import { PrinterCatalog } from '../printer-catalog/entities/printer-catalog.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Brand,
      Filament,
      FilamentCatalog,
      Printer,
      PrinterCatalog,
    ]),
  ],
  controllers: [BrandsController],
  providers: [BrandsService],
  // Lo usan filaments/printers/catálogos para reconciliar brandId en escritura.
  exports: [BrandsService],
})
export class BrandsModule {}
