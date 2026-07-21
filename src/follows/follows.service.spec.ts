import { FollowsService } from './follows.service';

/**
 * Los seguidores pueden ser CLIENTES (sin perfil público de maker): ni la
 * notificación ni las listas deben producir enlaces a /public/maker/:id que
 * acaben en 404.
 */
describe('FollowsService — seguidores cliente sin enlaces muertos', () => {
  const buildRepos = () => ({
    followRepo: {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn((x: unknown) => x),
      save: jest.fn(async (x: unknown) => x),
      delete: jest.fn(),
    },
    userRepo: { findOne: jest.fn() },
    notifications: { create: jest.fn().mockResolvedValue(undefined) },
  });

  const build = () => {
    const deps = buildRepos();
    const service = new FollowsService(
      deps.followRepo as never,
      deps.userRepo as never,
      deps.notifications as never,
    );
    return { service, ...deps };
  };

  it('seguidor MAKER → la notificación lleva link a su perfil público', async () => {
    const { service, userRepo, notifications } = build();
    userRepo.findOne.mockResolvedValue({ id: 'f1', fullName: 'Maker Fan', role: 'maker' });

    await service.follow('f1', 'm1');

    expect(notifications.create).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({ link: '/public/maker/f1' }),
    );
  });

  it('seguidor CLIENTE → la notificación NO lleva link (evita el 404)', async () => {
    const { service, userRepo, notifications } = build();
    userRepo.findOne.mockResolvedValue({ id: 'c1', fullName: 'Cliente', role: 'user' });

    await service.follow('c1', 'm1');

    const payload = notifications.create.mock.calls[0][1];
    expect(payload.link).toBeUndefined();
    expect(payload.body).toContain('Cliente');
  });

  it('getFollowers marca hasPublicProfile=false para los clientes', async () => {
    const { service, followRepo } = build();
    followRepo.find.mockResolvedValue([
      { follower: { id: 'c1', fullName: 'Cli', avatarUrl: null, location: null, role: 'user' } },
      { follower: { id: 'm2', fullName: 'Mak', avatarUrl: null, location: null, role: 'maker' } },
    ]);

    const rows = await service.getFollowers('m1');

    expect(rows.find((r) => r.id === 'c1')?.hasPublicProfile).toBe(false);
    expect(rows.find((r) => r.id === 'm2')?.hasPublicProfile).toBe(true);
  });
});
