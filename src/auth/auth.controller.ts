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
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { UpdateProfileDto } from '../users/dto/update-profile.dto.js';
import { ChangePasswordDto } from '../users/dto/change-password.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @UseGuards(AuthGuard('local'))
  login(@Request() req: { user: User }) {
    return this.authService.login(req.user);
  }

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
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

    const params = new URLSearchParams({
      token: result.accessToken,
      user: JSON.stringify(result.user),
    });

    res.redirect(`${frontendUrl}/auth/google-callback?${params.toString()}`);
  }
}
