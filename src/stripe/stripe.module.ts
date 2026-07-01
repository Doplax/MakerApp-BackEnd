import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeController } from './stripe.controller.js';
import { StripeService } from './stripe.service.js';
import { PurchasesModule } from '../purchases/purchases.module.js';
import { Project } from '../projects/entities/project.entity.js';

@Module({
  imports: [PurchasesModule, TypeOrmModule.forFeature([Project])],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
