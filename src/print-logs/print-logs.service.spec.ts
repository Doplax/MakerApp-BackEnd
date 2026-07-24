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

describe('PrintLogsService — guard anti-IDOR de create (proyecto/impresora ajenos)', () => {
  const user = { id: 'u1' } as User;

  /** Repo cuyo manager NO encuentra la fila (proyecto/impresora ajenos). */
  function repoWithManagerReturning(row: unknown) {
    const managerQb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(row),
    };
    return {
      manager: { createQueryBuilder: jest.fn(() => managerQb) },
      create: jest.fn((x: unknown) => x),
      save: jest.fn(async (x: unknown) => x),
    };
  }

  it('rechaza crear una impresión anidada en un proyecto AJENO', async () => {
    const repo = repoWithManagerReturning(undefined);
    const filaments = {
      findOne: jest.fn().mockResolvedValue({ id: 'f1', remainingWeight: 100 }),
    };
    const service = new PrintLogsService(
      repo as never,
      filaments as never,
      {} as never,
    );

    await expect(
      service.create(
        { name: 'x', weightUsed: 10, filamentId: 'f1', projectId: 'proyecto-de-otro' } as never,
        user,
      ),
    ).rejects.toThrow('Invalid project');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('acepta el proyecto cuando SÍ es del usuario (el guard consulta con su id)', async () => {
    const repo = repoWithManagerReturning({ id: 'p1' });
    const filaments = {
      findOne: jest.fn().mockResolvedValue({ id: 'f1', remainingWeight: 100 }),
      deductWeight: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PrintLogsService(
      repo as never,
      filaments as never,
      {} as never,
    );
    // findOne final del create: devuelve el guardado.
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'log1' } as never);

    await service.create(
      { name: 'x', weightUsed: 10, filamentId: 'f1', projectId: 'p1' } as never,
      user,
    );
    expect(repo.save).toHaveBeenCalled();
  });
});
