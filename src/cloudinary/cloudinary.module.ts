import { Module } from '@nestjs/common';
import { CloudinaryController } from './cloudinary.controller.js';
import { CloudinaryService } from './cloudinary.service.js';
import { StorageSweeperService } from './storage-sweeper.service.js';

@Module({
  controllers: [CloudinaryController],
  providers: [CloudinaryService, StorageSweeperService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
