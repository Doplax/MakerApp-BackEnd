import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { UsersService } from '../../users/users.service.js';
import { ACCESS_TOKEN_COOKIE } from '../auth-cookie.js';

interface JwtPayload {
  sub: string;
  email: string;
}

/** Extrae el JWT de la cookie httpOnly `access_token`. */
function cookieExtractor(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> })
    .cookies;
  return cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    configService: ConfigService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_SECRET no está definido — abortando arranque por seguridad',
      );
    }
    super({
      // Prioriza la cookie httpOnly; fallback al header Bearer (API externa/tests).
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    try {
      const user = await this.usersService.findOne(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException(
          'El usuario no existe o ha sido desactivado',
        );
      }
      return user;
    } catch {
      throw new UnauthorizedException(
        'Token inválido o expirado. Inicia sesión nuevamente.',
      );
    }
  }
}
