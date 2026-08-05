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
import { PurchaseOptionsService } from './purchase-options.service.js';
import { CreateFilamentCatalogDto } from './dto/create-filament-catalog.dto.js';
import { UpdateFilamentCatalogDto } from './dto/update-filament-catalog.dto.js';
import { FilterFilamentCatalogDto } from './dto/filter-filament-catalog.dto.js';
import {
  CreatePurchaseOptionDto,
  UpdatePurchaseOptionDto,
} from './dto/create-purchase-option.dto.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums/index.js';

@Controller('filament-catalog')
@UseGuards(AuthGuard('jwt'))
export class FilamentCatalogController {
  constructor(
    private readonly catalogService: FilamentCatalogService,
    private readonly purchaseOptions: PurchaseOptionsService,
  ) {}

  // ── Opciones de compra (comparador "Comprar en tienda") ─────────
  // Rutas ANTES de las genéricas ':id' para no colisionar con ellas.

  /** Opciones activas de un ítem (cualquier usuario logueado — comparador). */
  @Get('purchase-options/:catalogId')
  findPurchaseOptions(@Param('catalogId', ParseUUIDPipe) catalogId: string) {
    return this.purchaseOptions.findActiveForItem(catalogId);
  }

  /** Todas las opciones de un ítem, incluidas inactivas (gestor admin). */
  @Get('purchase-options/:catalogId/admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findPurchaseOptionsAdmin(
    @Param('catalogId', ParseUUIDPipe) catalogId: string,
  ) {
    return this.purchaseOptions.findAllForItemAdmin(catalogId);
  }

  @Post('purchase-options')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  createPurchaseOption(@Body() dto: CreatePurchaseOptionDto) {
    return this.purchaseOptions.create(dto);
  }

  @Patch('purchase-options/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updatePurchaseOption(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOptionDto,
  ) {
    return this.purchaseOptions.update(id, dto);
  }

  @Delete('purchase-options/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  removePurchaseOption(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchaseOptions.remove(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateFilamentCatalogDto) {
    return this.catalogService.create(dto);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  bulkUpsert(@Body() body: { items: CreateFilamentCatalogDto[] }) {
    return this.catalogService.bulkUpsert(body.items ?? []);
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
