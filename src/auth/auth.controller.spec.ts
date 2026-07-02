import type { Response } from 'express';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ConfigService } from '@nestjs/config';
import { ACCESS_TOKEN_COOKIE } from './auth-cookie.js';
import { User } from '../users/entities/user.entity.js';

/**
 * Tests del login por COOKIE httpOnly: el JWT debe ir en la cookie `access_token`
 * (nunca en el body ni en la URL), y logout debe borrarla.
 */
describe('AuthController (cookie auth)', () => {
  const makeRes = () =>
    ({
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      redirect: jest.fn(),
    }) as unknown as Response & {
      cookie: jest.Mock;
      clearCookie: jest.Mock;
      redirect: jest.Mock;
    };

  it('login: setea la cookie httpOnly con el JWT y NO devuelve el token en el body', () => {
    const res = makeRes();
    const authService = {
      login: jest
        .fn()
        .mockReturnValue({ user: { id: 'u1', email: 'a@b.c' }, accessToken: 'jwt-tok' }),
    } as unknown as AuthService;
    const controller = new AuthController(authService, {} as ConfigService);

    const result = controller.login({ user: { id: 'u1' } as User }, res);

    expect(res.cookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      'jwt-tok',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    );
    expect(result).toEqual({ user: { id: 'u1', email: 'a@b.c' } });
    // Crítico: el token NO debe salir en el body de la respuesta.
    expect((result as Record<string, unknown>).accessToken).toBeUndefined();
  });

  it('logout: borra la cookie de sesión', () => {
    const res = makeRes();
    const controller = new AuthController(
      {} as AuthService,
      {} as ConfigService,
    );

    const result = controller.logout(res);

    expect(res.clearCookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
    expect(result).toEqual({ message: expect.any(String) });
  });

  it('googleCallback: setea la cookie y redirige SIN token en la URL', () => {
    const res = makeRes();
    const authService = {
      googleLogin: jest
        .fn()
        .mockReturnValue({ user: { id: 'g1' }, accessToken: 'g-tok' }),
    } as unknown as AuthService;
    const config = {
      get: jest.fn().mockReturnValue('https://makerup.app'),
    } as unknown as ConfigService;
    const controller = new AuthController(authService, config);

    controller.googleCallback({ user: { id: 'g1' } as User }, res);

    expect(res.cookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      'g-tok',
      expect.objectContaining({ httpOnly: true }),
    );
    const redirectUrl = res.redirect.mock.calls[0][0] as string;
    expect(redirectUrl).toBe('https://makerup.app/auth/google-callback');
    expect(redirectUrl).not.toContain('token=');
  });
});
