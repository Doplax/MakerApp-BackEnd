import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../enums/index.js';

/**
 * La RolesGuard es la pieza que separa CLIENTE (user) de MAKER: bloquea a los
 * clientes de los endpoints de taller. Estas pruebas fijan ese comportamiento.
 */
describe('RolesGuard', () => {
  const buildContext = (user: unknown, required: UserRole[] | undefined) => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(required),
    };
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    };
    return { guard: new RolesGuard(reflector as never), ctx };
  };

  const WORKSHOP = [UserRole.MAKER, UserRole.ADMIN];

  it('sin @Roles (metadata ausente) deja pasar a cualquiera', () => {
    const { guard, ctx } = buildContext({ role: UserRole.USER }, undefined);
    expect(guard.canActivate(ctx as never)).toBe(true);
  });

  it('un CLIENTE (user) es BLOQUEADO en un endpoint de taller', () => {
    const { guard, ctx } = buildContext({ role: UserRole.USER }, WORKSHOP);
    expect(() => guard.canActivate(ctx as never)).toThrow(ForbiddenException);
  });

  it('un MAKER pasa en un endpoint de taller', () => {
    const { guard, ctx } = buildContext({ role: UserRole.MAKER }, WORKSHOP);
    expect(guard.canActivate(ctx as never)).toBe(true);
  });

  it('un ADMIN pasa en un endpoint de taller', () => {
    const { guard, ctx } = buildContext({ role: UserRole.ADMIN }, WORKSHOP);
    expect(guard.canActivate(ctx as never)).toBe(true);
  });

  it('un MAKER es bloqueado en un endpoint solo-admin', () => {
    const { guard, ctx } = buildContext({ role: UserRole.MAKER }, [UserRole.ADMIN]);
    expect(() => guard.canActivate(ctx as never)).toThrow(ForbiddenException);
  });

  it('sin usuario en la request lanza Forbidden', () => {
    const { guard, ctx } = buildContext(undefined, WORKSHOP);
    expect(() => guard.canActivate(ctx as never)).toThrow(ForbiddenException);
  });
});
