import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { User } from './entities/user.entity.js';
import { MakerReviewsModule } from '../maker-reviews/maker-reviews.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => MakerReviewsModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
