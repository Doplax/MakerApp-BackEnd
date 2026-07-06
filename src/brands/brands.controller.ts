import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BrandsService } from './brands.service.js';
import { CreateBrandDto } from './dto/create-brand.dto.js';
import { UpdateBrandDto } from './dto/update-brand.dto.js';
import { MergeBrandDto } from './dto/merge-brand.dto.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums/index.js';

@Controller('brands')
@UseGuards(AuthGuard('jwt'))
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  /** Listado para pickers/filtros (cualquier usuario logueado). */
  @Get()
  findAll(@Query('scope') scope?: string) {
    return this.brands.findAll(scope);
  }

  // 'admin' antes de ':id' para no colisionar con el ParseUUIDPipe de :id.
  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllAdmin() {
    return this.brands.findAllAdmin();
  }

  @Get(':id/products')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  products(@Param('id', ParseUUIDPipe) id: string) {
    return this.brands.findProducts(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateBrandDto) {
    return this.brands.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBrandDto) {
    return this.brands.update(id, dto);
  }

  @Post(':id/merge')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  merge(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MergeBrandDto) {
    return this.brands.merge(id, dto.sourceId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.brands.remove(id);
  }
}
