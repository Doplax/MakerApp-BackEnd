import type { CookieOptions } from 'express';

/** Nombre de la cookie httpOnly que transporta el JWT de sesión. */
export const ACCESS_TOKEN_COOKIE = 'access_token';

/** Duración de la sesión (debe coincidir con JWT_EXPIRATION). */
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

/**
 * Opciones de la cookie de sesión.
 * - httpOnly: el JavaScript del navegador NO puede leerla (mitiga robo por XSS).
 * - secure: solo por HTTPS en producción (en dev/localhost va por http).
 * - sameSite 'lax': se envía en peticiones del mismo sitio registrable
 *   (makerup.app ↔ api.makerup.app comparten `makerup.app`), y bloquea envíos
 *   cross-site (mitiga CSRF).
 */
export function accessTokenCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS,
  };
}

/** Opciones para BORRAR la cookie (mismas flags, sin maxAge). */
export function clearAccessTokenCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  };
}
