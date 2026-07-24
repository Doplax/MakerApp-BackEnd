import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole } from '../common/enums/index.js';

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

  describe('upgradeToMaker — cliente se convierte en maker (self-service)', () => {
    it('un cliente (role user) pasa a maker y se guarda', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', role: 'user' });
      const result = await service.upgradeToMaker('u1');
      expect(result.role).toBe('maker');
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u1', role: 'maker' }),
      );
    });

    it('NO degrada un admin (idempotente / sin tocar)', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'a1', role: 'admin' });
      const result = await service.upgradeToMaker('a1');
      expect(result.role).toBe('admin');
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('un maker ya existente no se re-guarda (idempotente)', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'm1', role: 'maker' });
      await service.upgradeToMaker('m1');
      expect(userRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findOrCreateGoogleUser — intent del registro (cliente/taller)', () => {
    it('con intent "maker" la cuenta NUEVA se crea como maker', async () => {
      userRepo.findOne.mockResolvedValue(null); // ni por googleId ni por email
      await service.findOrCreateGoogleUser({
        googleId: 'g1', email: 'nuevo@x.com', fullName: 'Nuevo', intent: 'maker',
      });
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'maker' }),
      );
    });

    it('sin intent la cuenta nueva es CLIENTE (user)', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await service.findOrCreateGoogleUser({
        googleId: 'g2', email: 'nuevo2@x.com', fullName: 'Nuevo2',
      });
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'user' }),
      );
    });

    it('a un usuario EXISTENTE (enlace por email) no se le toca el rol', async () => {
      // findByGoogleId → null; por email → maker existente.
      userRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'm1', email: 'ya@x.com', role: 'maker', googleId: null });
      await service.findOrCreateGoogleUser({
        googleId: 'g3', email: 'ya@x.com', fullName: 'Ya', intent: 'user',
      });
      expect(userRepo.create).not.toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'maker', googleId: 'g3' }),
      );
    });
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

  describe('updateProfile — disponibilidad (toggle Disponible/No disponible)', () => {
    it('aplica isAvailable=false al guardar (deja de aceptar presupuestos)', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1', avatarUrl: null, invoiceLogoUrl: null, isAvailable: true,
      });
      await service.updateProfile('u1', { isAvailable: false } as never);
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u1', isAvailable: false }),
      );
    });
  });

  describe('findMakersOnMap — disponibilidad y rating en los pins', () => {
    it('expone isAvailable (coalescido a true) y el rating agregado', async () => {
      const rows = [
        { id: 'm1', fullName: 'Laia', latitude: '40.4', longitude: '-3.7', isAvailable: false },
        { id: 'm2', fullName: 'Marc', latitude: '41.3', longitude: '2.1', isAvailable: undefined },
      ];
      userRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(rows),
      });
      const reviews = {
        getRatingSummaries: jest.fn().mockResolvedValue(
          new Map([['m1', { average: 4.9, count: 128 }]]),
        ),
      };
      const svc = new UsersService(
        userRepo as never,
        repoMock() as never,
        repoMock() as never,
        reviews as never,
        cloudinary as never,
      );

      const pins = await svc.findMakersOnMap();

      expect(reviews.getRatingSummaries).toHaveBeenCalledWith(['m1', 'm2']);
      expect(pins[0]).toEqual(
        expect.objectContaining({ id: 'm1', isAvailable: false, ratingAverage: 4.9, ratingCount: 128 }),
      );
      // Sin valor en BD (dev/synchronize) → disponible, el comportamiento histórico
      expect(pins[1]).toEqual(
        expect.objectContaining({ id: 'm2', isAvailable: true, ratingAverage: 0, ratingCount: 0 }),
      );
    });

    it('filtra por rol: solo maker/admin aparecen en el mapa (no clientes)', async () => {
      const andWhere = jest.fn().mockReturnThis();
      userRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere,
        getMany: jest.fn().mockResolvedValue([]),
      });
      const svc = new UsersService(
        userRepo as never,
        repoMock() as never,
        repoMock() as never,
        { getRatingSummaries: jest.fn().mockResolvedValue(new Map()) } as never,
        cloudinary as never,
      );

      await svc.findMakersOnMap();

      const roleCall = andWhere.mock.calls.find(
        ([sql, params]) => /role/i.test(sql) && params?.roles,
      );
      expect(roleCall).toBeDefined();
      expect(roleCall![1].roles).toEqual([UserRole.MAKER, UserRole.ADMIN]);
    });
  });

  describe('findPublicProfile — el cliente no tiene perfil público de maker', () => {
    it('lanza NotFound si el usuario es un cliente (role user)', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'c1', role: 'user', printers: [], projects: [] });
      await expect(service.findPublicProfile('c1')).rejects.toBeInstanceOf(NotFoundException);
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
