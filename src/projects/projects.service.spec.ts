import { ProjectsService } from './projects.service';

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
});
