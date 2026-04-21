import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import type { Provider } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsersModule } from '../users/users.module.js';
import { LocalStrategy } from './strategies/local.strategy.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { GoogleStrategy } from './strategies/google.strategy.js';

/** Registra GoogleStrategy solo si GOOGLE_CLIENT_ID está configurado */
const googleStrategyProvider: Provider = {
  provide: GoogleStrategy,
  inject: [ConfigService, AuthService],
  useFactory: (config: ConfigService, authService: AuthService) => {
    const clientId = config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      new Logger('AuthModule').warn(
        'GOOGLE_CLIENT_ID no configurado — Google OAuth deshabilitado',
      );
      return null;
    }
    return new GoogleStrategy(config, authService);
  },
};

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') || 'MakerUp-super-secret-key',
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRATION') ||
            '24h') as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, googleStrategyProvider],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
