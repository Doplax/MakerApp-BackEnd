import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { CalendarEvent } from './entities/calendar-event.entity.js';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto.js';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto.js';
import { User } from '../users/entities/user.entity.js';

/**
 * Eventos del calendario del maker. Igual que el mini-CRM de clientes, TODO
 * va scoped por el usuario autenticado (un maker nunca ve eventos de otro).
 */
@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(CalendarEvent)
    private readonly eventRepository: Repository<CalendarEvent>,
  ) {}

  findAll(user: User): Promise<CalendarEvent[]> {
    return this.eventRepository.find({
      where: { createdById: user.id },
      order: { startsAt: 'ASC' },
    });
  }

  /** Próximo evento PENDIENTE desde ahora (widget del dashboard). */
  findNext(user: User): Promise<CalendarEvent | null> {
    return this.eventRepository.findOne({
      where: {
        createdById: user.id,
        done: false,
        startsAt: MoreThanOrEqual(new Date()),
      },
      order: { startsAt: 'ASC' },
    });
  }

  async findOne(id: string, user: User): Promise<CalendarEvent> {
    const event = await this.eventRepository.findOne({
      where: { id, createdById: user.id },
    });
    if (!event) {
      throw new NotFoundException(`Evento ${id} no encontrado`);
    }
    return event;
  }

  create(dto: CreateCalendarEventDto, user: User): Promise<CalendarEvent> {
    const event = this.eventRepository.create({
      ...dto,
      startsAt: new Date(dto.startsAt),
      createdById: user.id,
    });
    return this.eventRepository.save(event);
  }

  async update(
    id: string,
    dto: UpdateCalendarEventDto,
    user: User,
  ): Promise<CalendarEvent> {
    const event = await this.findOne(id, user);
    const { startsAt, ...rest } = dto;
    Object.assign(event, rest);
    if (startsAt) event.startsAt = new Date(startsAt);
    return this.eventRepository.save(event);
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const event = await this.findOne(id, user);
    await this.eventRepository.remove(event);
    return { message: `Evento ${event.title} eliminado` };
  }
}
