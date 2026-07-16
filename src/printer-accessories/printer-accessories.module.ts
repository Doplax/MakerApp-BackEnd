import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrinterAccessoriesService } from './printer-accessories.service.js';
import { PrinterAccessoriesController } from './printer-accessories.controller.js';
import { PrinterAccessory } from './entities/printer-accessory.entity.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([PrinterAccessory]), CloudinaryModule],
  controllers: [PrinterAccessoriesController],
  providers: [PrinterAccessoriesService],
  exports: [PrinterAccessoriesService],
})
export class PrinterAccessoriesModule {}
