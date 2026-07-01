import { Controller, Get } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rates.service.js';

/**
 * Endpoint público (sin auth) de tasas de cambio.
 *
 * Es solo lectura y lo consume el frontend para convertir precios a la moneda
 * preferida del usuario. La respuesta la envuelve el TransformInterceptor global.
 */
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Get()
  getRates() {
    return this.exchangeRateService.getRates();
  }
}
