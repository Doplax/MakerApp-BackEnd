import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { resolveDatabaseUrl, resolveDatabaseSsl } from './database/db-config.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { FilamentsModule } from './filaments/filaments.module.js';
import { PrintersModule } from './printers/printers.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { PrintLogsModule } from './print-logs/print-logs.module.js';
import { StatisticsModule } from './statistics/statistics.module.js';
import { SeedModule } from './seed/seed.module.js';
import { PublicModule } from './public/public.module.js';
import { FollowsModule } from './follows/follows.module.js';
import { FavoritesModule } from './favorites/favorites.module.js';
import { FilamentCatalogModule } from './filament-catalog/filament-catalog.module.js';
import { PrinterCatalogModule } from './printer-catalog/printer-catalog.module.js';
import { BrandsModule } from './brands/brands.module.js';
import { FilamentOffersModule } from './filament-offers/filament-offers.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { StripeModule } from './stripe/stripe.module.js';
import { PurchasesModule } from './purchases/purchases.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';
import { MakerReviewsModule } from './maker-reviews/maker-reviews.module.js';
import { ChatModule } from './chat/chat.module.js';
import { CloudinaryModule } from './cloudinary/cloudinary.module.js';
import { MailModule } from './mail/mail.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { CalendarModule } from './calendar/calendar.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate limiting global: 120 req/min por IP por defecto (endpoints sensibles
    // como login/registro/reset llevan límites más estrictos con @Throttle).
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: resolveDatabaseUrl(),
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'maker_user',
        password: process.env.DB_PASSWORD || 'maker_password',
        database: process.env.DB_NAME || 'maker_db',
        autoLoadEntities: true,
        // synchronize DESACTIVADO por defecto (fail-safe): solo se activa con
        // DB_SYNCHRONIZE=true (desarrollo). En producción NO se define -> false.
        synchronize: process.env.DB_SYNCHRONIZE === 'true',
        // En producción (synchronize off) ejecuta las migraciones pendientes al
        // arrancar. TODAS son idempotentes (ADD COLUMN IF NOT EXISTS) -> seguro y
        // sin pérdida de datos. En dev (synchronize on) no se ejecutan.
        migrations: [join(__dirname, 'database', 'migrations', '*.js')],
        migrationsRun: process.env.DB_SYNCHRONIZE !== 'true',
        // SSL según la URL resuelta (helper). EasyPanel (prod) = sin SSL; Neon (dev) = SSL.
        ssl: resolveDatabaseSsl(),
      }),
    }),
    UsersModule,
    AuthModule,
    FilamentsModule,
    PrintersModule,
    ProjectsModule,
    PrintLogsModule,
    StatisticsModule,
    SeedModule,
    PublicModule,
    FollowsModule,
    FavoritesModule,
    FilamentCatalogModule,
    PrinterCatalogModule,
    BrandsModule,
    FilamentOffersModule,
    ReviewsModule,
    StripeModule,
    PurchasesModule,
    InvoicesModule,
    MakerReviewsModule,
    ChatModule,
    CloudinaryModule,
    MailModule,
    NotificationsModule,
    ExchangeRatesModule,
    ClientsModule,
    CalendarModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Aplica el rate limiting a toda la API
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
