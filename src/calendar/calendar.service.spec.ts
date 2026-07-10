import { NotFoundException } from '@nestjs/common';
import { MoreThanOrEqual } from 'typeorm';
import { CalendarService } from './calendar.service';
import type { CalendarEvent } from './entities/calendar-event.entity';
import type { User } from '../users/entities/user.entity';

/**
 * Calendario del maker: lo crítico es el SCOPING por usuario (como en
 * clientes) y que "próximo" = primer evento PENDIENTE desde ahora.
 */
describe('CalendarService', () => {
  const me = { id: 'user-1' } as User;

  const buildRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto: Partial<CalendarEvent>) => ({ ...dto })),
    save: jest.fn((entity: Partial<CalendarEvent>) =>
      Promise.resolve({ id: 'generated', ...entity }),
    ),
    remove: jest.fn().mockResolvedValue(undefined),
  });

  const buildService = (repo = buildRepo()) => ({
    service: new CalendarService(repo as never),
    repo,
  });

  it('findAll filtra por el usuario y ordena por fecha', async () => {
    const { service, repo } = buildService();
    repo.find.mockResolvedValue([]);

    await service.findAll(me);

    expect(repo.find).toHaveBeenCalledWith({
      where: { createdById: 'user-1' },
      order: { startsAt: 'ASC' },
    });
  });

  it('findNext pide el primer PENDIENTE desde ahora, del usuario', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue(null);

    await service.findNext(me);

    const arg = repo.findOne.mock.calls[0][0];
    expect(arg.where.createdById).toBe('user-1');
    expect(arg.where.done).toBe(false);
    // startsAt >= ahora (FindOperator de TypeORM).
    expect(arg.where.startsAt).toEqual(MoreThanOrEqual(expect.any(Date)));
    expect(arg.order).toEqual({ startsAt: 'ASC' });
  });

  it('create asigna el evento al usuario y convierte la fecha', async () => {
    const { service, repo } = buildService();

    const saved = await service.create(
      { title: 'Mantenimiento A1', startsAt: '2026-07-18T11:00:00.000Z', notes: 'Lubricar ejes' },
      me,
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Mantenimiento A1',
        createdById: 'user-1',
        startsAt: new Date('2026-07-18T11:00:00.000Z'),
      }),
    );
    expect(saved.id).toBe('generated');
  });

  it('findOne con id ajeno → NotFound (scoping)', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue(null);

    await expect(service.findOne('ev-1', me)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 'ev-1', createdById: 'user-1' },
    });
  });

  it('update marca hecho sin tocar la fecha si no viene', async () => {
    const { service, repo } = buildService();
    const original = new Date('2026-07-18T11:00:00.000Z');
    repo.findOne.mockResolvedValue({
      id: 'ev-1', title: 'Mantenimiento A1', startsAt: original, done: false, createdById: 'user-1',
    });

    await service.update('ev-1', { done: true }, me);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ev-1', done: true, startsAt: original }),
    );
  });
});
