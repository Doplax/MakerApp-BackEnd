import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MakerReview } from './entities/maker-review.entity.js';
import { Purchase } from '../purchases/entities/purchase.entity.js';
import { MakerReviewsService } from './maker-reviews.service.js';
import { MakerReviewsController } from './maker-reviews.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([MakerReview, Purchase])],
  controllers: [MakerReviewsController],
  providers: [MakerReviewsService],
  exports: [MakerReviewsService],
})
export class MakerReviewsModule {}
