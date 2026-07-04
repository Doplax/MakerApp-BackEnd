import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  it('delega create() en el servicio con el usuario actual', () => {
    const svc = { create: jest.fn().mockResolvedValue({ id: 'pr1' }) };
    const controller = new ProjectsController(svc as unknown as ProjectsService);
    const dto = { name: 'X' } as never;
    const user = { id: 'u1' } as never;
    void controller.create(dto, user);
    expect(svc.create).toHaveBeenCalledWith(dto, user);
  });

  it('findAll() reenvía el usuario y la query de paginación al servicio', () => {
    const svc = { findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }) };
    const controller = new ProjectsController(svc as unknown as ProjectsService);
    const user = { id: 'u1' } as never;
    const query = { page: 2, limit: 10, period: 'week' } as never;
    void controller.findAll(user, query);
    expect(svc.findAll).toHaveBeenCalledWith(user, query);
  });
});
