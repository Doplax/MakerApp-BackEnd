import { PrintersController } from './printers.controller';
import { PrintersService } from './printers.service';

describe('PrintersController', () => {
  it('delega create() en el servicio con el usuario actual', () => {
    const svc = { create: jest.fn().mockResolvedValue({ id: 'p1' }) };
    const controller = new PrintersController(svc as unknown as PrintersService);
    const dto = { name: 'X' } as never;
    const user = { id: 'u1' } as never;
    void controller.create(dto, user);
    expect(svc.create).toHaveBeenCalledWith(dto, user);
  });
});
