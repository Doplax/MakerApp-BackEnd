import { Module } from '@nestjs/common';
import { CloudinaryController } from './cloudinary.controller.js';
import { CloudinaryService } from './cloudinary.service.js';

@Module({
  controllers: [CloudinaryController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
