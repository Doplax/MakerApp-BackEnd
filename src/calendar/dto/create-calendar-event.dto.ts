import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CALENDAR_EVENT_TYPES } from '../entities/calendar-event.entity.js';
import type { CalendarEventType } from '../entities/calendar-event.entity.js';

export class CreateCalendarEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @IsIn(CALENDAR_EVENT_TYPES)
  @IsOptional()
  type?: CalendarEventType;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @IsDateString()
  startsAt!: string;

  @IsBoolean()
  @IsOptional()
  done?: boolean;
}
