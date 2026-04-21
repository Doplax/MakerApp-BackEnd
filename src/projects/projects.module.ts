import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service.js';
import { ProjectsController } from './projects.controller.js';
import { Project } from './entities/project.entity.js';
import { Filament } from '../filaments/entities/filament.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { Printer } from '../printers/entities/printer.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Filament, Printer]), AuthModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
