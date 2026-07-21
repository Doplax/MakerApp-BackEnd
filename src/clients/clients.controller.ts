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
import { ClientsService } from './clients.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums/index.js';

/** Clientes del maker (mini-CRM). Todo scoped por el usuario autenticado. */
@Controller('clients')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.MAKER, UserRole.ADMIN)
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.clients.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.clients.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateClientDto, @CurrentUser() user: User) {
    return this.clients.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: User,
  ) {
    return this.clients.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.clients.remove(id, user);
  }
}
