import { PartialType } from '@nestjs/mapped-types';
import { CreateCalendarEventDto } from './create-calendar-event.dto.js';

export class UpdateCalendarEventDto extends PartialType(CreateCalendarEventDto) {}
