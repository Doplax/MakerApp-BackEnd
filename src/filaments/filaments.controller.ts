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
import { FilamentsService } from './filaments.service.js';
import { CreateFilamentDto } from './dto/create-filament.dto.js';
import { UpdateFilamentDto } from './dto/update-filament.dto.js';
import { FilterFilamentDto } from './dto/filter-filament.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

@Controller('filaments')
@UseGuards(AuthGuard('jwt'))
export class FilamentsController {
  constructor(private readonly filamentsService: FilamentsService) {}

  @Post()
  create(
    @Body() createFilamentDto: CreateFilamentDto,
    @CurrentUser() user: User,
  ) {
    return this.filamentsService.create(createFilamentDto, user);
  }

  @Get()
  findAll(@Query() filterDto: FilterFilamentDto, @CurrentUser() user: User) {
    return this.filamentsService.findAll(filterDto, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.filamentsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFilamentDto: UpdateFilamentDto,
    @CurrentUser() user: User,
  ) {
    return this.filamentsService.update(id, updateFilamentDto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.filamentsService.remove(id, user);
  }
}
