import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { UpdateProfileDto } from '../users/dto/update-profile.dto.js';
import { ChangePasswordDto } from '../users/dto/change-password.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import {
  ACCESS_TOKEN_COOKIE,
  accessTokenCookieOptions,
  clearAccessTokenCookieOptions,
} from './auth-cookie.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // anti fuerza bruta
  @UseGuards(AuthGuard('local'))
  login(
    @Request() req: { user: User },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = this.authService.login(req.user);
    // El JWT va en una cookie httpOnly; el body devuelve solo el user (sin token).
    res.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, accessTokenCookieOptions());
    return { user: result.user };
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(registerDto);
    res.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, accessTokenCookieOptions());
    return { user: result.user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, clearAccessTokenCookieOptions());
    return { message: 'Sesión cerrada' };
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // anti email bombing
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@CurrentUser() user: User) {
    return this.authService.getProfile(user.id);
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Patch('change-password')
  @UseGuards(AuthGuard('jwt'))
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto);
  }

  @Get('check')
  @UseGuards(AuthGuard('jwt'))
  checkAuth(@CurrentUser() user: User) {
    return { authenticated: true, userId: user.id };
  }

  /**
   * Un CLIENTE se convierte en MAKER (self-service, "Crea tu taller"). Reemite la
   * cookie con el rol nuevo para que el front lo refleje sin re-login.
   */
  @Post('upgrade-to-maker')
  @UseGuards(AuthGuard('jwt'))
  async upgradeToMaker(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.upgradeToMaker(user.id);
    res.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, accessTokenCookieOptions());
    return { user: result.user };
  }

  // ── Google OAuth ──────────────────────────────────────────
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport redirige a Google automáticamente
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Request() req: { user: User }, @Res() res: Response) {
    const result = this.authService.googleLogin(req.user);
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4210';

    // Sesión por cookie httpOnly (NO exponer el token en la URL de redirect).
    res.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, accessTokenCookieOptions());
    res.redirect(`${frontendUrl}/auth/google-callback`);
  }
}
