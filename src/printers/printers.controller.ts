import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrintersService } from './printers.service.js';
import { CreatePrinterDto } from './dto/create-printer.dto.js';
import { UpdatePrinterDto } from './dto/update-printer.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

@Controller('printers')
@UseGuards(AuthGuard('jwt'))
export class PrintersController {
  constructor(private readonly printersService: PrintersService) {}

  @Post()
  create(
    @Body() createPrinterDto: CreatePrinterDto,
    @CurrentUser() user: User,
  ) {
    return this.printersService.create(createPrinterDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.printersService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.printersService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePrinterDto: UpdatePrinterDto,
    @CurrentUser() user: User,
  ) {
    return this.printersService.update(id, updatePrinterDto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.printersService.remove(id, user);
  }
}
