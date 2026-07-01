import { Injectable, Logger } from '@nestjs/common';

/**
 * Divisas soportadas por la app (además de EUR, que es la base).
 * Deben coincidir con las validadas en UpdateProfileDto.currency.
 */
const SUPPORTED_CURRENCIES = [
  'USD',
  'GBP',
  'CHF',
  'CAD',
  'AUD',
  'JPY',
  'MXN',
] as const;

/** TTL de la caché en memoria: 12 horas. */
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

/** URL de la API gratuita frankfurter (base EUR). */
const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?from=EUR';

export interface ExchangeRates {
  base: 'EUR';
  rates: Record<string, number>;
  updatedAt: string;
}

interface FrankfurterResponse {
  base?: string;
  date?: string;
  rates?: Record<string, number>;
}

/**
 * Servicio de tasas de cambio EN VIVO con caché en memoria.
 *
 * Obtiene las tasas base EUR desde la API gratuita frankfurter usando el
 * `fetch` global de Node 22. Cachea el resultado 12h. Si la llamada externa
 * falla, devuelve la última caché válida; si nunca hubo caché, devuelve un
 * fallback razonable (solo EUR:1). NUNCA lanza una excepción que tumbe el
 * endpoint: los errores se registran con Logger.
 */
@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);

  /** Última respuesta válida cacheada (null si aún no hay ninguna). */
  private cache: ExchangeRates | null = null;

  /** Momento (ms epoch) en que se pobló la caché. */
  private cachedAt = 0;

  async getRates(): Promise<ExchangeRates> {
    const now = Date.now();

    // Caché válida dentro del TTL -> se devuelve directamente.
    if (this.cache && now - this.cachedAt < CACHE_TTL_MS) {
      return this.cache;
    }

    try {
      const fresh = await this.fetchRates();
      this.cache = fresh;
      this.cachedAt = now;
      return fresh;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `No se pudieron obtener las tasas de cambio en vivo: ${message}`,
      );

      // Degradación elegante: última caché válida si existe...
      if (this.cache) {
        this.logger.warn('Sirviendo tasas de cambio desde la caché anterior.');
        return this.cache;
      }

      // ...o fallback mínimo (solo EUR:1) si nunca hubo caché.
      return {
        base: 'EUR',
        rates: { EUR: 1 },
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Descarga las tasas desde frankfurter y las normaliza:
   * - base EUR con EUR:1 siempre presente.
   * - se garantizan las divisas soportadas (frankfurter las devuelve todas).
   */
  private async fetchRates(): Promise<ExchangeRates> {
    const response = await fetch(FRANKFURTER_URL);

    if (!response.ok) {
      throw new Error(
        `frankfurter respondió ${response.status} ${response.statusText}`,
      );
    }

    const payload = (await response.json()) as FrankfurterResponse;
    const sourceRates = payload.rates ?? {};

    // Siempre incluye EUR:1 (frankfurter no lo devuelve porque es la base).
    const rates: Record<string, number> = { EUR: 1 };

    for (const code of SUPPORTED_CURRENCIES) {
      const value = sourceRates[code];
      if (typeof value === 'number' && Number.isFinite(value)) {
        rates[code] = value;
      }
    }

    return {
      base: 'EUR',
      rates,
      updatedAt: new Date().toISOString(),
    };
  }
}
