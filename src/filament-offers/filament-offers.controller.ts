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
import { FilamentOffersService } from './filament-offers.service.js';
import { CreateFilamentOfferDto } from './dto/create-filament-offer.dto.js';
import { UpdateFilamentOfferDto } from './dto/update-filament-offer.dto.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums/index.js';

@Controller('filament-offers')
@UseGuards(AuthGuard('jwt'))
export class FilamentOffersController {
  constructor(private readonly offers: FilamentOffersService) {}

  /** Ofertas activas (cualquier usuario logueado — página Filamentos). */
  @Get()
  findActive() {
    return this.offers.findActive();
  }

  // 'admin' antes de ':id' para no colisionar con el ParseUUIDPipe de :id.
  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllAdmin() {
    return this.offers.findAllAdmin();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateFilamentOfferDto) {
    return this.offers.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFilamentOfferDto,
  ) {
    return this.offers.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.offers.remove(id);
  }
}
