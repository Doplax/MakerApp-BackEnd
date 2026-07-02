import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Purchase } from './entities/purchase.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { User } from '../users/entities/user.entity.js';
import { PurchasesService } from './purchases.service.js';
import { PurchasesController } from './purchases.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Purchase, Project, User]),
    NotificationsModule,
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService, TypeOrmModule],
})
export class PurchasesModule {}
