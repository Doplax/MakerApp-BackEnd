import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilamentOffersService } from './filament-offers.service.js';
import { FilamentOffersController } from './filament-offers.controller.js';
import { FilamentOffer } from './entities/filament-offer.entity.js';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([FilamentOffer]), CloudinaryModule],
  controllers: [FilamentOffersController],
  providers: [FilamentOffersService],
  exports: [FilamentOffersService],
})
export class FilamentOffersModule {}
