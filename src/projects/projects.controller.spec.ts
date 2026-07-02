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
});
