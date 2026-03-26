import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { UpdateProfileDto } from '../users/dto/update-profile.dto.js';
import { ChangePasswordDto } from '../users/dto/change-password.dto.js';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
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

  async getProfile(userId: string) {
    const user = await this.usersService.findOne(userId);
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      latitude: user.latitude,
      longitude: user.longitude,
      website: user.website,
      tiktok: user.tiktok,
      instagram: user.instagram,
      facebook: user.facebook,
      youtube: user.youtube,
      twitter: user.twitter,
      customLinks: user.customLinks,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(userId, dto);
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      latitude: user.latitude,
      longitude: user.longitude,
      website: user.website,
      tiktok: user.tiktok,
      instagram: user.instagram,
      facebook: user.facebook,
      youtube: user.youtube,
      twitter: user.twitter,
      customLinks: user.customLinks,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    return this.usersService.changePassword(userId, dto);
  }
}
