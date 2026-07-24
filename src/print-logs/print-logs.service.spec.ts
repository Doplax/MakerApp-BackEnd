import { PrintLogsService } from './print-logs.service';
import { PrintStatus } from '../common/enums/index.js';
import { User } from '../users/entities/user.entity.js';

/** Update query builder encadenable que captura los WHERE y devuelve `affected`. */
function updateQbMock(affected: number) {
  const calls: { where: string[]; params: Record<string, unknown> } = { where: [], params: {} };
  const qb = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn((clause: string, params?: Record<string, unknown>) => {
      calls.where.push(clause);
      Object.assign(calls.params, params ?? {});
      return qb;
    }),
    andWhere: jest.fn((clause: string, params?: Record<string, unknown>) => {
      calls.where.push(clause);
      Object.assign(calls.params, params ?? {});
      return qb;
    }),
    execute: jest.fn().mockResolvedValue({ affected }),
    __calls: calls,
  };
  return qb;
}

describe('PrintLogsService — limpiar del kanban (dismissDelivered)', () => {
  const user = { id: 'u1' } as User;

  function makeService(qb: ReturnType<typeof updateQbMock>) {
    const repo = { createQueryBuilder: jest.fn(() => qb) };
    // Solo se ejercita dismissDelivered: el resto de dependencias no se usan.
    return new PrintLogsService(
      repo as never,
      {} as never, // filamentsService
      {} as never, // cloudinary
    );
  }

  it('marca dismissedAt SOLO de logs propios, completados y aún visibles', async () => {
    const qb = updateQbMock(2);
    const service = makeService(qb);

    const result = await service.dismissDelivered(['a', 'b', 'c'], user);

    expect(result).toEqual({ dismissed: 2 });
    expect(qb.set).toHaveBeenCalledWith({ dismissedAt: expect.any(Date) });
    const where = qb.__calls.where.join(' AND ');
    // Propiedad (anti-IDOR), estado completado e idempotencia en el WHERE.
    expect(where).toContain('"createdById" = :userId');
    expect(where).toContain('status = :status');
    expect(where).toContain('"dismissedAt" IS NULL');
    expect(qb.__calls.params['userId']).toBe('u1');
    expect(qb.__calls.params['status']).toBe(PrintStatus.COMPLETED);
    expect(qb.__calls.params['ids']).toEqual(['a', 'b', 'c']);
  });

  it('con lista vacía no toca la BD y devuelve 0', async () => {
    const qb = updateQbMock(0);
    const service = makeService(qb);

    const result = await service.dismissDelivered([], user);

    expect(result).toEqual({ dismissed: 0 });
    expect(qb.execute).not.toHaveBeenCalled();
  });
});
