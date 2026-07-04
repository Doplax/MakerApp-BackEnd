import { ProjectsService } from './projects.service';

/**
 * QueryBuilder encadenable: cada método del builder devuelve el propio mock, y
 * `getMany`/`getManyAndCount` devuelven lo que se configure. Registra las llamadas a
 * `skip`/`take`/`andWhere` para poder aserverlas.
 */
function queryBuilderMock() {
  const qb: Record<string, jest.Mock> = {};
  const chain =
    (name: string) =>
    (...args: unknown[]) => {
      qb[`${name}Args`]?.(...args);
      return qb;
    };
  for (const m of [
    'leftJoinAndSelect',
    'where',
    'andWhere',
    'orderBy',
    'addOrderBy',
    'skip',
    'take',
  ]) {
    qb[`${m}Args`] = jest.fn();
    qb[m] = jest.fn(chain(m));
  }
  qb.getMany = jest.fn();
  qb.getManyAndCount = jest.fn();
  return qb;
}

/** Repositorio mock con los métodos que usa el servicio. */
function repoMock() {
  return {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: unknown) => x),
    findOne: jest.fn(),
    findBy: jest.fn(),
    remove: jest.fn(async () => undefined),
    createQueryBuilder: jest.fn(),
  };
}

describe('ProjectsService', () => {
  let projectRepo: ReturnType<typeof repoMock>;
  let cloudinary: { deleteByUrl: jest.Mock };
  let service: ProjectsService;
  const user = { id: 'u1' } as never;

  beforeEach(() => {
    projectRepo = repoMock();
    cloudinary = { deleteByUrl: jest.fn().mockResolvedValue(undefined) };
    service = new ProjectsService(
      projectRepo as never,
      repoMock() as never, // filaments
      repoMock() as never, // printers
      repoMock() as never, // printLogs
      cloudinary as never,
    );
  });

  it('create() asigna el usuario propietario y guarda', async () => {
    projectRepo.save.mockResolvedValue({ id: 'pr1', name: 'Test' });
    await service.create({ name: 'Test' } as never, user);
    expect(projectRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test', createdBy: user }),
    );
    expect(projectRepo.save).toHaveBeenCalled();
  });

  it('update() borra el fichero de licencia antiguo cuando cambia', async () => {
    const project = {
      id: 'pr1',
      imageUrl: 'https://api.test/uploads/projects/a.png',
      licenseFileUrl: 'https://api.test/uploads/licenses/old.pdf',
      createdBy: user,
    };
    projectRepo.findOne.mockResolvedValue(project);
    await service.update(
      'pr1',
      { licenseFileUrl: 'https://api.test/uploads/licenses/new.pdf' } as never,
      user,
    );
    expect(cloudinary.deleteByUrl).toHaveBeenCalledWith(
      'https://api.test/uploads/licenses/old.pdf',
    );
    // La imagen no cambió → no debe borrarse.
    expect(cloudinary.deleteByUrl).not.toHaveBeenCalledWith(
      'https://api.test/uploads/projects/a.png',
    );
  });

  it('remove() borra imagen y licencia del almacenamiento', async () => {
    const project = {
      id: 'pr1',
      name: 'Test',
      imageUrl: 'https://api.test/uploads/projects/a.png',
      licenseFileUrl: 'https://api.test/uploads/licenses/l.pdf',
      createdBy: user,
    };
    projectRepo.findOne.mockResolvedValue(project);
    await service.remove('pr1', user);
    expect(projectRepo.remove).toHaveBeenCalledWith(project);
    expect(cloudinary.deleteByUrl).toHaveBeenCalledWith(
      'https://api.test/uploads/projects/a.png',
    );
    expect(cloudinary.deleteByUrl).toHaveBeenCalledWith(
      'https://api.test/uploads/licenses/l.pdf',
    );
  });

  describe('findAll()', () => {
    it('sin page/limit devuelve la lista COMPLETA (array) — no pagina', async () => {
      const qb = queryBuilderMock();
      const all = [{ id: 'a' }, { id: 'b' }];
      qb.getMany.mockResolvedValue(all);
      projectRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(user, {});

      expect(result).toBe(all);
      expect(qb.getMany).toHaveBeenCalled();
      expect(qb.getManyAndCount).not.toHaveBeenCalled();
      // No debe aplicar límites cuando no se pagina.
      expect(qb.skip).not.toHaveBeenCalled();
      expect(qb.take).not.toHaveBeenCalled();
    });

    it('con page/limit devuelve { data, total, page, limit } y aplica skip/take', async () => {
      const qb = queryBuilderMock();
      const pageData = [{ id: 'x' }];
      qb.getManyAndCount.mockResolvedValue([pageData, 23]);
      projectRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(user, { page: 3, limit: 10 });

      expect(result).toEqual({ data: pageData, total: 23, page: 3, limit: 10 });
      // page 3, limit 10 → offset 20
      expect(qb.skipArgs).toHaveBeenCalledWith(20);
      expect(qb.takeArgs).toHaveBeenCalledWith(10);
      expect(qb.getMany).not.toHaveBeenCalled();
    });

    it('solo con limit pagina (page por defecto = 1, offset 0)', async () => {
      const qb = queryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      projectRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(user, { limit: 5 });

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 5 });
      expect(qb.skipArgs).toHaveBeenCalledWith(0);
      expect(qb.takeArgs).toHaveBeenCalledWith(5);
    });

    it('period="week" añade un filtro de fecha de corte', async () => {
      const qb = queryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      projectRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(user, { period: 'week' });

      expect(qb.andWhereArgs).toHaveBeenCalledWith(
        'project.createdAt >= :cutoff',
        expect.objectContaining({ cutoff: expect.any(Date) }),
      );
    });

    it('period="all" no añade filtro de fecha', async () => {
      const qb = queryBuilderMock();
      qb.getMany.mockResolvedValue([]);
      projectRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(user, { period: 'all' });

      expect(qb.andWhereArgs).not.toHaveBeenCalled();
    });
  });
});
