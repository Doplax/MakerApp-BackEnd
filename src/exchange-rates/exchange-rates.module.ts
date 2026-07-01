import { Module } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rates.service.js';
import { ExchangeRatesController } from './exchange-rates.controller.js';

@Module({
  providers: [ExchangeRateService],
  controllers: [ExchangeRatesController],
  exports: [ExchangeRateService],
})
export class ExchangeRatesModule {}
