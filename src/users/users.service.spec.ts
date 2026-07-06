import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';

function repoMock() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(async () => 1),
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: unknown) => x),
    update: jest.fn(async () => undefined),
    remove: jest.fn(async () => undefined),
    manager: { createQueryBuilder: jest.fn() },
    createQueryBuilder: jest.fn(),
  };
}

/** Query builder encadenable que resuelve `raw` en getRawOne(). */
function queryBuilderReturning(raw: unknown) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(raw),
  };
}

describe('UsersService', () => {
  let userRepo: ReturnType<typeof repoMock>;
  let cloudinary: { deleteByUrl: jest.Mock };
  let service: UsersService;

  beforeEach(() => {
    userRepo = repoMock();
    cloudinary = { deleteByUrl: jest.fn().mockResolvedValue(undefined) };
    service = new UsersService(
      userRepo as never,
      repoMock() as never, // filaments
      repoMock() as never, // printLogs
      {} as never, // makerReviewsService
      cloudinary as never,
    );
  });

  describe('updateProfile — guardas de proyecto destacado (anti-IDOR)', () => {
    it('rechaza destacar un proyecto que no pertenece al usuario', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', avatarUrl: null, invoiceLogoUrl: null });
      userRepo.manager.createQueryBuilder.mockReturnValue(
        queryBuilderReturning({ id: 'p1', isPublic: true, createdById: 'OTHER' }),
      );
      await expect(
        service.updateProfile('u1', { featuredProjectId: 'p1' } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza destacar un proyecto que no es público', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', avatarUrl: null, invoiceLogoUrl: null });
      userRepo.manager.createQueryBuilder.mockReturnValue(
        queryBuilderReturning({ id: 'p1', isPublic: false, createdById: 'u1' }),
      );
      await expect(
        service.updateProfile('u1', { featuredProjectId: 'p1' } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateProfile — limpieza de ficheros', () => {
    it('borra el avatar antiguo cuando se reemplaza', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1',
        avatarUrl: 'https://api.test/uploads/avatars/old.png',
        invoiceLogoUrl: null,
      });
      await service.updateProfile('u1', {
        avatarUrl: 'https://api.test/uploads/avatars/new.png',
      } as never);
      expect(cloudinary.deleteByUrl).toHaveBeenCalledWith(
        'https://api.test/uploads/avatars/old.png',
      );
    });
  });

  describe('remove — soft-delete (desactiva, no borra la fila)', () => {
    it('desactiva al usuario sin borrar la fila ni tocar ficheros', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.c', isActive: true });
      const res = await service.remove('u1', 'admin');
      expect(userRepo.update).toHaveBeenCalledWith('u1', { isActive: false });
      expect(userRepo.remove).not.toHaveBeenCalled();
      expect(cloudinary.deleteByUrl).not.toHaveBeenCalled();
      expect(res.message).toMatch(/deactivat/i);
    });

    it('es idempotente si el usuario ya estaba desactivado', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.c', isActive: false });
      await service.remove('u1', 'admin');
      expect(userRepo.update).not.toHaveBeenCalled();
      expect(userRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('rechaza si la contraseña actual es incorrecta', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1',
        checkPassword: jest.fn().mockResolvedValue(false),
      });
      await expect(
        service.changePassword('u1', {
          currentPassword: 'wrong',
          newPassword: 'newpass',
        } as never),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('actualiza la contraseña cuando la actual es correcta', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1',
        password: 'old',
        checkPassword: jest.fn().mockResolvedValue(true),
      });
      const res = await service.changePassword('u1', {
        currentPassword: 'ok',
        newPassword: 'newpass',
      } as never);
      expect(userRepo.save).toHaveBeenCalled();
      expect(res.message).toBeDefined();
    });
  });

  describe('update / remove — guardas anti-lockout de admin', () => {
    const admin = (over: Record<string, unknown> = {}) => ({
      id: 'admin1',
      email: 'admin@x.com',
      role: 'admin',
      isActive: true,
      avatarUrl: null,
      ...over,
    });

    it('update: un admin NO puede desactivarse a sí mismo', async () => {
      userRepo.findOne.mockResolvedValue(admin());
      await expect(
        service.update('admin1', { isActive: false } as never, 'admin1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('update: un admin NO puede quitarse a sí mismo el rol de administrador', async () => {
      userRepo.findOne.mockResolvedValue(admin());
      await expect(
        service.update('admin1', { role: 'user' } as never, 'admin1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('update: NO se puede desactivar al último admin activo (aunque lo haga otro admin)', async () => {
      userRepo.findOne.mockResolvedValue(admin({ id: 'target' }));
      userRepo.count.mockResolvedValue(0); // no quedan otros admins activos
      await expect(
        service.update('target', { isActive: false } as never, 'admin1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('update: desactivar a un admin SÍ se permite si queda otro admin activo', async () => {
      userRepo.findOne.mockResolvedValue(admin({ id: 'target' }));
      userRepo.count.mockResolvedValue(1);
      await service.update('target', { isActive: false } as never, 'admin1');
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('update: email duplicado → BadRequest (400), no 500', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(admin({ id: 'target', email: 'target@x.com' }))
        .mockResolvedValueOnce({ id: 'OTHER', email: 'taken@x.com' });
      await expect(
        service.update('target', { email: 'Taken@x.com' } as never, 'admin1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('remove: un admin NO puede desactivarse a sí mismo', async () => {
      userRepo.findOne.mockResolvedValue(admin());
      await expect(service.remove('admin1', 'admin1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('remove: NO se puede desactivar al último admin activo', async () => {
      userRepo.findOne.mockResolvedValue(admin({ id: 'target' }));
      userRepo.count.mockResolvedValue(0);
      await expect(service.remove('target', 'admin1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
