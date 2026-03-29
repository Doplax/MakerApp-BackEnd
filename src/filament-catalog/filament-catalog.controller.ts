import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilamentCatalogService } from './filament-catalog.service.js';
import { CreateFilamentCatalogDto } from './dto/create-filament-catalog.dto.js';
import { UpdateFilamentCatalogDto } from './dto/update-filament-catalog.dto.js';
import { FilterFilamentCatalogDto } from './dto/filter-filament-catalog.dto.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums/index.js';

@Controller('filament-catalog')
@UseGuards(AuthGuard('jwt'))
export class FilamentCatalogController {
  constructor(private readonly catalogService: FilamentCatalogService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateFilamentCatalogDto) {
    return this.catalogService.create(dto);
  }

  @Get()
  findAll(@Query() filterDto: FilterFilamentCatalogDto) {
    return this.catalogService.findAll(filterDto);
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllAdmin(@Query() filterDto: FilterFilamentCatalogDto) {
    return this.catalogService.findAllAdmin(filterDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFilamentCatalogDto,
  ) {
    return this.catalogService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogService.remove(id);
  }
}
