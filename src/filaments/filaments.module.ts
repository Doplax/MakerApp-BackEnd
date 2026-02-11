import { Module } from '@nestjs/common';
import { FilamentsService } from './filaments.service';
import { FilamentsController } from './filaments.controller';

@Module({
  controllers: [FilamentsController],
  providers: [FilamentsService],
})
export class FilamentsModule {}
