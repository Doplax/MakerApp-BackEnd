import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotesService } from './notes.service';
import type { Note } from './entities/note.entity';
import type { User } from '../users/entities/user.entity';

/**
 * Notas del taller: lo crítico es el SCOPING por usuario (una nota ajena es
 * un 404, nunca se toca) y el guard anti-IDOR del proyecto vinculado (no se
 * puede colgar una nota del proyecto de otra persona).
 */
describe('NotesService', () => {
  const me = { id: 'user-1' } as User;

  /** QB de lectura encadenable (findAll/findOne); captura where y orderBy. */
  function selectQbMock(result: unknown) {
    const calls = {
      where: [] as string[],
      order: [] as Array<[string, string]>,
      params: {} as Record<string, unknown>,
    };
    const qb = {
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
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
      orderBy: jest.fn((col: string, dir: string) => {
        calls.order.push([col, dir]);
        return qb;
      }),
      addOrderBy: jest.fn((col: string, dir: string) => {
        calls.order.push([col, dir]);
        return qb;
      }),
      getMany: jest.fn().mockResolvedValue(result),
      getOne: jest.fn().mockResolvedValue(result),
      __calls: calls,
    };
    return qb;
  }

  /** Repo cuyo manager resuelve el guard de proyecto con `row` (undefined = ajeno). */
  function buildRepo(opts: { noteRow?: unknown; projectRow?: unknown } = {}) {
    const selectQb = selectQbMock(opts.noteRow ?? null);
    const managerQb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(opts.projectRow),
    };
    return {
      createQueryBuilder: jest.fn(() => selectQb),
      manager: { createQueryBuilder: jest.fn(() => managerQb) },
      create: jest.fn((x: Partial<Note>) => x as Note),
      save: jest.fn(async (x: Partial<Note>) => ({ id: 'n-1', ...x }) as Note),
      remove: jest.fn().mockResolvedValue(undefined),
      __selectQb: selectQb,
      __managerQb: managerQb,
    };
  }

  const buildService = (repo = buildRepo()) => ({
    service: new NotesService(repo as never),
    repo,
  });

  it('findAll filtra por el usuario y ordena FIJADAS primero, luego updatedAt desc', async () => {
    const repo = buildRepo();
    repo.__selectQb.getMany.mockResolvedValue([]);
    const { service } = buildService(repo);

    await service.findAll(me);

    const calls = repo.__selectQb.__calls;
    expect(calls.where.join(' AND ')).toContain('"createdById" = :userId');
    expect(calls.params['userId']).toBe('user-1');
    // Orden: pinned DESC y después updatedAt DESC (fijadas arriba).
    expect(calls.order).toEqual([
      ['note.pinned', 'DESC'],
      ['note.updatedAt', 'DESC'],
    ]);
  });

  it('create rechaza vincular la nota a un proyecto AJENO (guard anti-IDOR) sin guardar nada', async () => {
    const repo = buildRepo({ projectRow: undefined });
    const { service } = buildService(repo);

    await expect(
      service.create(
        { title: 'x', projectId: 'proyecto-de-otro' },
        me,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('create con proyecto PROPIO guarda scoped al usuario y con la relación puesta', async () => {
    const repo = buildRepo({ projectRow: { id: 'p-1' } });
    const { service } = buildService(repo);
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 'n-1' } as Note);

    await service.create({ title: 'Pedidos', projectId: 'p-1', pinned: true }, me);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Pedidos',
        pinned: true,
        project: { id: 'p-1' },
        createdById: 'user-1',
      }),
    );
    expect(repo.save).toHaveBeenCalled();
  });

  it('update de una nota AJENA → NotFound (scoping) y no guarda', async () => {
    const repo = buildRepo({ noteRow: null });
    const { service } = buildService(repo);

    await expect(
      service.update('nota-de-otro', { title: 'hack' }, me),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.save).not.toHaveBeenCalled();
    // El findOne interno consulta SIEMPRE con el id del usuario.
    expect(repo.__selectQb.__calls.params['userId']).toBe('user-1');
  });

  it('update con projectId null DESVINCULA la nota (vuelve a general)', async () => {
    const note = {
      id: 'n-1',
      title: 'Con proyecto',
      project: { id: 'p-1' },
      createdById: 'user-1',
    } as unknown as Note;
    const repo = buildRepo();
    const { service } = buildService(repo);
    jest.spyOn(service, 'findOne').mockResolvedValue(note);

    await service.update('n-1', { projectId: null }, me);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n-1', project: null }),
    );
  });

  it('update reasignando a un proyecto ajeno → BadRequest sin guardar', async () => {
    const repo = buildRepo({
      noteRow: { id: 'n-1', title: 'mía', createdById: 'user-1' },
      projectRow: undefined,
    });
    const { service } = buildService(repo);

    await expect(
      service.update('n-1', { projectId: 'proyecto-de-otro' }, me),
    ).rejects.toThrow('Invalid project');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('remove de una nota AJENA → NotFound y no borra', async () => {
    const repo = buildRepo({ noteRow: null });
    const { service } = buildService(repo);

    await expect(service.remove('nota-de-otro', me)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('remove borra la nota propia', async () => {
    const repo = buildRepo({
      noteRow: { id: 'n-1', title: 'Lista compra', createdById: 'user-1' },
    });
    const { service } = buildService(repo);

    const res = await service.remove('n-1', me);

    expect(repo.remove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'n-1' }),
    );
    expect(res.message).toContain('Lista compra');
  });
});
