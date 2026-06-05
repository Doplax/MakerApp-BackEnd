import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';
import { Notification } from './entities/notification.entity.js';
import { PrintersModule } from '../printers/printers.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), PrintersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
