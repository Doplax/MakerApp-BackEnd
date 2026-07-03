import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';
import { Review } from './entities/review.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { PurchasesModule } from '../purchases/purchases.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Project]), PurchasesModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
