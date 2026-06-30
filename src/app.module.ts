import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { ReviewsModule } from './reviews/reviews.module.js';
import { StripeModule } from './stripe/stripe.module.js';
import { PurchasesModule } from './purchases/purchases.module.js';
import { MakerReviewsModule } from './maker-reviews/maker-reviews.module.js';
import { ChatModule } from './chat/chat.module.js';
import { CloudinaryModule } from './cloudinary/cloudinary.module.js';
import { MailModule } from './mail/mail.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'maker_user',
        password: process.env.DB_PASSWORD || 'maker_password',
        database: process.env.DB_NAME || 'maker_db',
        autoLoadEntities: true,
        // synchronize gateado por entorno: activo salvo DB_SYNCHRONIZE=false.
        // En producción poner DB_SYNCHRONIZE=false y usar migraciones.
        synchronize: process.env.DB_SYNCHRONIZE !== 'false',
        // SSL condicional: activo solo si DB_SSL=true o la URL pide sslmode=require.
        // BD interna de EasyPanel = sin SSL; Neon (dev) = DB_SSL=true.
        ssl:
          process.env.DB_SSL === 'true' ||
          process.env.DATABASE_URL?.includes('sslmode=require')
            ? { rejectUnauthorized: false }
            : false,
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
    ReviewsModule,
    StripeModule,
    PurchasesModule,
    MakerReviewsModule,
    ChatModule,
    CloudinaryModule,
    MailModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
