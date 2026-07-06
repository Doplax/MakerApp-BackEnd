import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrintersService } from './printers.service.js';
import { PrintersController } from './printers.controller.js';
import { Printer } from './entities/printer.entity.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';
import { BrandsModule } from '../brands/brands.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Printer]), CloudinaryModule, BrandsModule],
  controllers: [PrintersController],
  providers: [PrintersService],
  exports: [PrintersService],
})
export class PrintersModule {}
