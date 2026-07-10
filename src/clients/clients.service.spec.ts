import { NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import type { Client } from './entities/client.entity';
import type { User } from '../users/entities/user.entity';

/**
 * Mini-CRM de clientes: lo crítico es el SCOPING por usuario — un maker no
 * puede ver, editar ni borrar clientes de otro (todas las queries filtran
 * por createdById y el id ajeno responde NotFound).
 */
describe('ClientsService', () => {
  const me = { id: 'user-1' } as User;
  const other = { id: 'user-2' } as User;

  const buildRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto: Partial<Client>) => ({ ...dto })),
    save: jest.fn((entity: Partial<Client>) =>
      Promise.resolve({ id: 'generated', ...entity }),
    ),
    remove: jest.fn().mockResolvedValue(undefined),
  });

  const buildService = (repo = buildRepo()) => ({
    service: new ClientsService(repo as never),
    repo,
  });

  it('findAll filtra por el usuario y ordena por nombre', async () => {
    const { service, repo } = buildService();
    repo.find.mockResolvedValue([]);

    await service.findAll(me);

    expect(repo.find).toHaveBeenCalledWith({
      where: { createdById: 'user-1' },
      order: { name: 'ASC' },
    });
  });

  it('create asigna el cliente al usuario autenticado', async () => {
    const { service, repo } = buildService();

    const saved = await service.create({ name: 'Laia Bosch', nif: '12345678Z' }, me);

    expect(repo.create).toHaveBeenCalledWith({
      name: 'Laia Bosch',
      nif: '12345678Z',
      createdById: 'user-1',
    });
    expect(saved.id).toBe('generated');
  });

  it('findOne exige que el cliente sea del usuario (id ajeno → NotFound)', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue(null);

    await expect(service.findOne('client-1', other)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 'client-1', createdById: 'user-2' },
    });
  });

  it('update aplica cambios parciales sobre el cliente propio', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue({
      id: 'client-1',
      name: 'Laia',
      nif: null,
      createdById: 'user-1',
    });

    await service.update('client-1', { address: 'C/ Mayor 1, Manresa' }, me);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'client-1',
        name: 'Laia',
        address: 'C/ Mayor 1, Manresa',
      }),
    );
  });

  it('remove borra el cliente propio y confirma con el nombre', async () => {
    const { service, repo } = buildService();
    repo.findOne.mockResolvedValue({ id: 'client-1', name: 'Laia', createdById: 'user-1' });

    const res = await service.remove('client-1', me);

    expect(repo.remove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'client-1' }),
    );
    expect(res.message).toContain('Laia');
  });
});
