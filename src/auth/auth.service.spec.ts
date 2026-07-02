import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Auth es la puerta de todo el marketplace. Estas pruebas fijan invariantes que
 * un refactor no debe romper: no enumeración de cuentas, rechazo de duplicados,
 * email de bienvenida no bloqueante y respuesta genérica en "olvidé contraseña".
 */
describe('AuthService', () => {
  let usersService: {
    findByEmail: jest.Mock;
    create: jest.Mock;
    setPasswordResetToken: jest.Mock;
  };
  let jwt: { sign: jest.Mock };
  let mail: { sendWelcome: jest.Mock; sendPasswordReset: jest.Mock };
  let config: { get: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      setPasswordResetToken: jest.fn().mockResolvedValue(undefined),
    };
    jwt = { sign: jest.fn().mockReturnValue('token') };
    mail = {
      sendWelcome: jest.fn().mockResolvedValue(undefined),
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    };
    config = { get: jest.fn().mockReturnValue('http://localhost:4210') };
    service = new AuthService(
      usersService as never,
      jwt as never,
      mail as never,
      config as never,
    );
  });

  describe('register', () => {
    it('rechaza un email ya registrado', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 'u1' });
      await expect(
        service.register({ email: 'a@b.c', fullName: 'A', password: 'x' } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('crea el usuario y devuelve un accessToken', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({ id: 'u1', email: 'a@b.c', fullName: 'A', role: 'user' });
      const res = await service.register({ email: 'a@b.c', fullName: 'A', password: 'x' } as never);
      expect(res.accessToken).toBe('token');
      expect(res.user.email).toBe('a@b.c');
    });

    it('el fallo del email de bienvenida no rompe el alta', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({ id: 'u1', email: 'a@b.c', fullName: 'A', role: 'user' });
      mail.sendWelcome.mockRejectedValue(new Error('SMTP down'));
      await expect(
        service.register({ email: 'a@b.c', fullName: 'A', password: 'x' } as never),
      ).resolves.toBeDefined();
    });
  });

  describe('validateUser — sin enumeración de cuentas', () => {
    it('email desconocido → Unauthorized con mensaje genérico', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(service.validateUser('nope@x.com', 'x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('contraseña incorrecta → mismo error genérico', async () => {
      usersService.findByEmail.mockResolvedValue({
        isActive: true,
        checkPassword: jest.fn().mockResolvedValue(false),
      });
      await expect(service.validateUser('a@b.c', 'wrong')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('usuario desactivado → Unauthorized', async () => {
      usersService.findByEmail.mockResolvedValue({
        isActive: false,
        checkPassword: jest.fn().mockResolvedValue(true),
      });
      await expect(service.validateUser('a@b.c', 'ok')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('credenciales correctas → devuelve el usuario', async () => {
      const user = { id: 'u1', isActive: true, checkPassword: jest.fn().mockResolvedValue(true) };
      usersService.findByEmail.mockResolvedValue(user);
      await expect(service.validateUser('a@b.c', 'ok')).resolves.toBe(user);
    });
  });

  describe('forgotPassword — respuesta genérica anti-enumeración', () => {
    it('email desconocido → respuesta genérica, sin enviar correo', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const res = await service.forgotPassword({ email: 'nope@x.com' } as never);
      expect(res.message).toBeDefined();
      expect(mail.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('email conocido → guarda token y envía correo, misma respuesta genérica', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 'u1', email: 'a@b.c', isActive: true });
      await service.forgotPassword({ email: 'a@b.c' } as never);
      expect(usersService.setPasswordResetToken).toHaveBeenCalled();
      expect(mail.sendPasswordReset).toHaveBeenCalled();
    });
  });
});
