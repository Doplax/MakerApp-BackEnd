/**
 * Selección de la conexión a la base de datos según el entorno.
 *
 * - PRODUCCIÓN (servidor real / EasyPanel): usa `DATABASE_URL`.
 * - DESARROLLO (Neon): usa `DATABASE_URL_DEV` cuando `NODE_ENV !== 'production'`.
 *
 * Producción **nunca** debe definir `DATABASE_URL_DEV`; si no está, se cae en
 * `DATABASE_URL`, de modo que el comportamiento en prod es idéntico al anterior
 * (retrocompatible). Ver `context/database.md` y `context/produccion.md`.
 */
export function resolveDatabaseUrl(): string | undefined {
  const isProd = process.env.NODE_ENV === 'production';
  const devUrl = process.env.DATABASE_URL_DEV;
  return !isProd && devUrl ? devUrl : process.env.DATABASE_URL;
}

/**
 * SSL condicional según la URL de BD **resuelta**: activo si `DB_SSL=true` o la
 * URL pide `sslmode=require` (Neon). La BD interna de EasyPanel usa
 * `sslmode=disable` → sin SSL.
 */
export function resolveDatabaseSsl(
  url: string | undefined = resolveDatabaseUrl(),
): { rejectUnauthorized: boolean } | false {
  return process.env.DB_SSL === 'true' || url?.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false;
}
