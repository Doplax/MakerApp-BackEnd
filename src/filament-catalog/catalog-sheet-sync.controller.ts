import {
  Controller,
  Post,
  Headers,
  HttpCode,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CatalogSheetSyncService } from './catalog-sheet-sync.service.js';

/**
 * Webhook de sincronización del catálogo desde Google Sheets. Controlador
 * SEPARADO del de catálogo a propósito: aquí NO hay guard JWT (lo llama el Apps
 * Script de la hoja); la autenticación es el secreto compartido `x-sync-token`
 * (comparación en tiempo constante) + rate-limit propio.
 */
@Controller('filament-catalog')
export class CatalogSheetSyncController {
  constructor(private readonly syncService: CatalogSheetSyncService) {}

  // Rate-limit estricto (además del global): 10 pings/min bastan de sobra — el
  // servicio ya coalesce ráfagas en un único re-sync.
  @Post('sync')
  @HttpCode(202)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  sync(@Headers('x-sync-token') token?: string) {
    if (!this.syncService.isConfigured()) {
      throw new ServiceUnavailableException(
        'La sincronización del catálogo no está configurada en este entorno',
      );
    }
    if (!this.syncService.verifyToken(token)) {
      throw new UnauthorizedException('Token de sincronización inválido');
    }
    return this.syncService.requestSync();
  }
}
