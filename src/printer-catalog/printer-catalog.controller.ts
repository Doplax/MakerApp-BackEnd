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
import { PrinterCatalogService } from './printer-catalog.service.js';
import { CreatePrinterCatalogDto } from './dto/create-printer-catalog.dto.js';
import { UpdatePrinterCatalogDto } from './dto/update-printer-catalog.dto.js';
import { FilterPrinterCatalogDto } from './dto/filter-printer-catalog.dto.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums/index.js';

@Controller('printer-catalog')
@UseGuards(AuthGuard('jwt'))
export class PrinterCatalogController {
  constructor(private readonly catalogService: PrinterCatalogService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreatePrinterCatalogDto) {
    return this.catalogService.create(dto);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  bulkUpsert(@Body() body: { items: CreatePrinterCatalogDto[] }) {
    return this.catalogService.bulkUpsert(body.items ?? []);
  }

  /** Carga los modelos predefinidos (fuente única en el back). Upsert no destructivo. */
  @Post('seed-defaults')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  seedDefaults() {
    return this.catalogService.seedDefaults();
  }

  @Get()
  findAll(@Query() filterDto: FilterPrinterCatalogDto) {
    return this.catalogService.findAll(filterDto);
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllAdmin(@Query() filterDto: FilterPrinterCatalogDto) {
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
    @Body() dto: UpdatePrinterCatalogDto,
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
