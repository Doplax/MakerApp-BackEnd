import { FilamentsController } from './filaments.controller';
import { FilamentsService } from './filaments.service';

describe('FilamentsController', () => {
  it('delega create() en el servicio con el usuario actual', () => {
    const svc = { create: jest.fn().mockResolvedValue({ id: 'f1' }) };
    const controller = new FilamentsController(svc as unknown as FilamentsService);
    const dto = { brand: 'X' } as never;
    const user = { id: 'u1' } as never;
    void controller.create(dto, user);
    expect(svc.create).toHaveBeenCalledWith(dto, user);
  });
});
