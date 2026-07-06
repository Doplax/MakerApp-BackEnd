import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrinterCatalogService } from './printer-catalog.service.js';
import { PrinterCatalogController } from './printer-catalog.controller.js';
import { PrinterCatalog } from './entities/printer-catalog.entity.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';
import { BrandsModule } from '../brands/brands.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrinterCatalog]),
    CloudinaryModule,
    BrandsModule,
  ],
  controllers: [PrinterCatalogController],
  providers: [PrinterCatalogService],
  exports: [PrinterCatalogService],
})
export class PrinterCatalogModule {}
