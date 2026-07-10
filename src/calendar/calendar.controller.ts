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
import { CalendarService } from './calendar.service.js';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto.js';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

/** Calendario del maker. Todo scoped por el usuario autenticado. */
@Controller('calendar-events')
@UseGuards(AuthGuard('jwt'))
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.calendar.findAll(user);
  }

  // 'next' antes de ':id' para no colisionar con el ParseUUIDPipe.
  @Get('next')
  findNext(@CurrentUser() user: User) {
    return this.calendar.findNext(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.calendar.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateCalendarEventDto, @CurrentUser() user: User) {
    return this.calendar.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCalendarEventDto,
    @CurrentUser() user: User,
  ) {
    return this.calendar.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.calendar.remove(id, user);
  }
}
