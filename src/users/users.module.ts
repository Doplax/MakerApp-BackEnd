import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { User } from './entities/user.entity.js';
import { Filament } from '../filaments/entities/filament.entity.js';
import { PrintLog } from '../print-logs/entities/print-log.entity.js';
import { MakerReviewsModule } from '../maker-reviews/maker-reviews.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Filament, PrintLog]), forwardRef(() => MakerReviewsModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
