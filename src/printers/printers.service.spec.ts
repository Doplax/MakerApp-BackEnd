import { PrintersService } from './printers.service';

describe('PrintersService', () => {
  it('se instancia con sus dependencias mockeadas', () => {
    const repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const svc = new PrintersService(repo as never, { deleteByUrl: jest.fn() } as never);
    expect(svc).toBeDefined();
  });
});
