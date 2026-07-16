import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrinterAccessoriesService } from './printer-accessories.service.js';
import { CreatePrinterAccessoryDto } from './dto/create-printer-accessory.dto.js';
import { UpdatePrinterAccessoryDto } from './dto/update-printer-accessory.dto.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums/index.js';

@Controller('printer-accessories')
@UseGuards(AuthGuard('jwt'))
export class PrinterAccessoriesController {
  constructor(private readonly service: PrinterAccessoriesService) {}

  /** Activos para una marca (ficha de impresora). ?brand=…&kind=accessory|spare */
  @Get()
  findActive(@Query('brand') brand?: string, @Query('kind') kind?: string) {
    return this.service.findActive(brand, kind);
  }

  // 'admin' antes de ':id' para no colisionar con el ParseUUIDPipe.
  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllAdmin() {
    return this.service.findAllAdmin();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreatePrinterAccessoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrinterAccessoryDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
