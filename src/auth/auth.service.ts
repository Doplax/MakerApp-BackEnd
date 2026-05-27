import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import { UsersService } from '../users/users.service.js';
import { MailService } from '../mail/mail.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { UpdateProfileDto } from '../users/dto/update-profile.dto.js';
import { ChangePasswordDto } from '../users/dto/change-password.dto.js';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private static readonly RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException(
        'El correo electrónico no se encuentra registrado',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta de usuario está desactivada');
    }

    const isPasswordValid = await user.checkPassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('La contraseña es incorrecta');
    }

    return user;
  }

  login(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    this.logger.log(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      accessToken: this.jwtService.sign(payload),
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const user = await this.usersService.create({
      fullName: registerDto.fullName,
      email: registerDto.email,
      password: registerDto.password,
    });

    this.logger.log(`User registered: ${user.email}`);

    // Welcome email — non blocking: si falla el SMTP no rompemos el alta
    this.mailService.sendWelcome(user.email, user.fullName).catch((err) => {
      this.logger.warn(
        `No se pudo enviar el email de bienvenida a ${user.email}: ${err?.message ?? err}`,
      );
    });

    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      accessToken: this.jwtService.sign(payload),
    };
  }

  /**
   * Inicia el flujo de recuperación de contraseña.
   * Responde siempre con éxito para evitar enumeración de emails.
   */
  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const genericResponse = {
      message:
        'Si existe una cuenta con ese email, recibirás un mensaje con instrucciones.',
    };

    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) return genericResponse;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + AuthService.RESET_TOKEN_TTL_MS);

    await this.usersService.setPasswordResetToken(
      user.id,
      hashedToken,
      expiresAt,
    );

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:4210';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${rawToken}`;

    try {
      await this.mailService.sendPasswordReset(user.email, resetUrl);
    } catch (err) {
      // No exponemos el fallo al cliente para mantener respuesta genérica,
      // pero lo registramos para diagnóstico.
      this.logger.error(
        `Fallo enviando email de reset a ${user.email}`,
        err as Error,
      );
    }

    return genericResponse;
  }

  /**
   * Consume el token y establece la nueva contraseña.
   */
  async resetPassword(
    dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const hashedToken = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');

    const user = await this.usersService.findByPasswordResetToken(hashedToken);
    if (!user) {
      throw new BadRequestException(
        'El enlace de recuperación es inválido o ha expirado',
      );
    }

    await this.usersService.resetPasswordWithToken(user.id, dto.password);

    return { message: 'Contraseña actualizada correctamente' };
  }

  async getProfile(userId: string) {
    return this.usersService.findOne(userId);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    return this.usersService.changePassword(userId, dto);
  }

  async validateGoogleUser(profile: {
    googleId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  }): Promise<User> {
    return this.usersService.findOrCreateGoogleUser(profile);
  }

  googleLogin(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    this.logger.log(`Google login: ${user.email}`);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      accessToken: this.jwtService.sign(payload),
    };
  }
}
