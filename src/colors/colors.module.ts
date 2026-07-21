import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ColorsService } from './colors.service.js';
import { ColorsController } from './colors.controller.js';
import { Color } from './entities/color.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Color])],
  controllers: [ColorsController],
  providers: [ColorsService],
  exports: [ColorsService],
})
export class ColorsModule {}
