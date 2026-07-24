import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service.js';

export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly authService: AuthService;

  constructor(configService: ConfigService, authService: AuthService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID')!;
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET')!;
    const callbackURL =
      configService.get<string>('GOOGLE_CALLBACK_URL') ||
      'http://localhost:5000/api/auth/google/callback';

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
      // Necesario para leer el `state` (intent cliente/taller) en el callback.
      passReqToCallback: true,
    });

    this.authService = authService;
  }

  async validate(
    req: { query?: { state?: string } },
    accessToken: string,
    refreshToken: string,
    profile: {
      id: string;
      emails?: { value: string }[];
      displayName?: string;
      photos?: { value: string }[];
    },
    done: VerifyCallback,
  ): Promise<void> {
    const { id, emails, displayName, photos } = profile;

    // El tipo de cuenta elegido en el registro viaja como `state` del OAuth
    // (lo pone GoogleAuthGuard). Solo aplica al CREAR la cuenta; nunca admin.
    const state = req?.query?.state;
    const intent = state === 'maker' || state === 'user' ? state : undefined;

    const user = await this.authService.validateGoogleUser({
      googleId: id,
      email: emails?.[0]?.value || '',
      fullName: displayName || '',
      avatarUrl: photos?.[0]?.value || undefined,
      intent,
    });

    done(null, user);
  }
}
