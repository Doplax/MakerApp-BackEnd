import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ColorsService } from './colors.service.js';
import { CreateColorDto } from './dto/create-color.dto.js';
import { UpdateColorDto } from './dto/update-color.dto.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums/index.js';

@Controller('colors')
export class ColorsController {
  constructor(private readonly colors: ColorsService) {}

  /**
   * Colores activos. PÚBLICO (sin auth): lo consume el formulario de presupuesto,
   * que es una página pública para visitantes no logueados.
   */
  @Get()
  findActive() {
    return this.colors.findActive();
  }

  // 'admin' antes de ':id' para no colisionar con el ParseUUIDPipe de :id.
  @Get('admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllAdmin() {
    return this.colors.findAllAdmin();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateColorDto) {
    return this.colors.create(dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateColorDto,
  ) {
    return this.colors.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.colors.remove(id);
  }
}
