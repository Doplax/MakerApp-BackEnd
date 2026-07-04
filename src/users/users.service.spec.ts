import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';

function repoMock() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
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
      const res = await service.remove('u1');
      expect(userRepo.update).toHaveBeenCalledWith('u1', { isActive: false });
      expect(userRepo.remove).not.toHaveBeenCalled();
      expect(cloudinary.deleteByUrl).not.toHaveBeenCalled();
      expect(res.message).toMatch(/deactivat/i);
    });

    it('es idempotente si el usuario ya estaba desactivado', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.c', isActive: false });
      await service.remove('u1');
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
});
