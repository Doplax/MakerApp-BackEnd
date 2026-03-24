import { Module } from '@nestjs/common';
import { PublicController } from './public.controller.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [UsersModule],
  controllers: [PublicController],
})
export class PublicModule {}
