import { ConflictException, NotFoundException } from '@nestjs/common';
import { ColorsService } from './colors.service';
import { DEFAULT_COLORS } from './default-colors';
import type { Color } from './entities/color.entity';

describe('ColorsService', () => {
  const buildRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto: Partial<Color>) => ({ ...dto })),
    save: jest.fn((entity: unknown) => Promise.resolve(entity)),
    remove: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn(),
  });

  const withNameClash = (repo: ReturnType<typeof buildRepo>, clash: unknown) => {
    repo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(clash),
    });
  };

  const build = (repo = buildRepo()) => ({
    service: new ColorsService(repo as never),
    repo,
  });

  it('findActive pide solo colores activos y ordenados', async () => {
    const { service, repo } = build();
    repo.find.mockResolvedValue([]);
    await service.findActive();
    expect(repo.find).toHaveBeenCalledWith({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  });

  describe('onModuleInit (siembra idempotente)', () => {
    it('siembra el set base completo cuando la tabla está vacía', async () => {
      const { service, repo } = build();
      repo.find.mockResolvedValue([]);
      await service.onModuleInit();
      expect(repo.save).toHaveBeenCalledTimes(1);
      const rows = repo.save.mock.calls[0][0] as Color[];
      expect(rows.length).toBe(DEFAULT_COLORS.length);
      expect(rows.map((r) => r.name)).toContain('Rojo');
    });

    it('NO reinserta los que ya existen (idempotente, case-insensitive)', async () => {
      const { service, repo } = build();
      // Todos ya presentes (con distinta caja): no debe sembrar nada.
      repo.find.mockResolvedValue(
        DEFAULT_COLORS.map((c) => ({ name: c.name.toUpperCase() })),
      );
      await service.onModuleInit();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('solo siembra los que faltan (aditivo)', async () => {
      const { service, repo } = build();
      repo.find.mockResolvedValue([{ name: 'Rojo' }, { name: 'Azul' }]);
      await service.onModuleInit();
      const rows = repo.save.mock.calls[0][0] as Color[];
      expect(rows.length).toBe(DEFAULT_COLORS.length - 2);
      expect(rows.map((r) => r.name)).not.toContain('Rojo');
    });

    it('no propaga el error si la BD falla (no tumba el arranque)', async () => {
      const { service, repo } = build();
      repo.find.mockRejectedValue(new Error('DB down'));
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  it('create rechaza nombres duplicados (case-insensitive)', async () => {
    const { service, repo } = build();
    withNameClash(repo, { id: 'x', name: 'rojo' });
    await expect(service.create({ name: 'Rojo', swatch: '#EF4444' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('create guarda cuando el nombre está libre', async () => {
    const { service, repo } = build();
    withNameClash(repo, null);
    const saved = await service.create({ name: 'Coral', swatch: '#FF7F50' });
    expect(repo.save).toHaveBeenCalled();
    expect(saved.name).toBe('Coral');
  });

  it('findOne lanza NotFoundException si no existe', async () => {
    const { service, repo } = build();
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove elimina el color', async () => {
    const { service, repo } = build();
    repo.findOne.mockResolvedValue({ id: 'c-1', name: 'Verde' });
    const result = await service.remove('c-1');
    expect(repo.remove).toHaveBeenCalled();
    expect(result.message).toContain('Verde');
  });
});
