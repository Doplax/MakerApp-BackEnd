import { FilamentsService } from './filaments.service';

describe('FilamentsService', () => {
  it('se instancia con sus dependencias mockeadas', () => {
    const repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findBy: jest.fn(),
    };
    const svc = new FilamentsService(
      repo as never,
      repo as never,
      { deleteByUrl: jest.fn() } as never,
    );
    expect(svc).toBeDefined();
  });
});
