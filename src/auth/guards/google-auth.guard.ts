import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard de inicio del OAuth de Google que propaga el tipo de cuenta elegido en
 * el registro (`?intent=maker|user`) como `state` del flujo. Google lo devuelve
 * intacto en el callback y la estrategia lo usa SOLO al crear la cuenta (nunca
 * cambia el rol de un usuario existente, y nunca admite otros valores).
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  override getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ query?: { intent?: string } }>();
    const intent = req.query?.intent;
    return intent === 'maker' || intent === 'user' ? { state: intent } : {};
  }
}

/**
 * Arranque del OAuth en modo VINCULAR (botón de Ajustes): `state='link'` hace
 * que la estrategia devuelva el perfil sin buscar/crear usuario y el callback
 * lo asocie a la sesión actual (cookie httpOnly, mismo host → viaja).
 */
@Injectable()
export class GoogleLinkGuard extends AuthGuard('google') {
  override getAuthenticateOptions() {
    return { state: 'link' };
  }
}
