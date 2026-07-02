import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  it('delega create() en el servicio', () => {
    const svc = { create: jest.fn().mockResolvedValue({ id: 'u1' }) };
    const controller = new UsersController(svc as unknown as UsersService);
    const dto = { email: 'a@b.c', fullName: 'A', password: 'x' } as never;
    void controller.create(dto);
    expect(svc.create).toHaveBeenCalledWith(dto);
  });
});
