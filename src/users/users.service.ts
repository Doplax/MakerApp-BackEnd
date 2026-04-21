import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new BadRequestException(
        `User with email ${createUserDto.email} already exists`,
      );
    }

    const user = this.userRepository.create({
      ...createUserDto,
      email: createUserDto.email.toLowerCase(),
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`User created: ${savedUser.email}`);

    delete (savedUser as Partial<User>).password;
    return savedUser;
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      select: [
        'id',
        'fullName',
        'email',
        'password',
        'role',
        'isActive',
        'avatarUrl',
      ],
    });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { googleId } });
  }

  async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  }): Promise<User> {
    // 1. Check if user already linked by googleId
    let user = await this.findByGoogleId(profile.googleId);
    if (user) return user;

    // 2. Check if email already exists (link Google to existing account)
    user = await this.userRepository.findOne({
      where: { email: profile.email.toLowerCase() },
    });

    if (user) {
      user.googleId = profile.googleId;
      if (!user.avatarUrl && profile.avatarUrl) {
        user.avatarUrl = profile.avatarUrl;
      }
      return this.userRepository.save(user);
    }

    // 3. Create new user (no password needed for Google users)
    const newUser = this.userRepository.create({
      googleId: profile.googleId,
      email: profile.email.toLowerCase(),
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
    });

    const saved = await this.userRepository.save(newUser);
    this.logger.log(`Google user created: ${saved.email}`);
    return saved;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email) {
      updateUserDto.email = updateUserDto.email.toLowerCase();
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
    return { message: `User ${user.email} has been removed` };
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    const saved = await this.userRepository.save(user);
    delete (saved as Partial<User>).password;
    return saved;
  }

  async changePassword(
    id: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'password'],
    });

    if (!user) throw new NotFoundException('User not found');

    const valid = await user.checkPassword(dto.currentPassword);
    if (!valid) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }

    user.password = dto.newPassword; // @BeforeUpdate hash
    await this.userRepository.save(user);
    this.logger.log(`Password changed for user ${id}`);
    return { message: 'Contraseña actualizada correctamente' };
  }

  /**
   * Devuelve todos los makers activos que tienen coordenadas definidas,
   * con la información mínima necesaria para mostrarlos en el mapa.
   */
  async findMakersOnMap(): Promise<
    {
      id: string;
      fullName: string;
      avatarUrl: string;
      bio: string;
      location: string;
      latitude: number;
      longitude: number;
    }[]
  > {
    const makers = await this.userRepository
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.fullName',
        'u.avatarUrl',
        'u.bio',
        'u.location',
        'u.latitude',
        'u.longitude',
      ])
      .where('u.isActive = :active', { active: true })
      .andWhere('u.latitude IS NOT NULL')
      .andWhere('u.longitude IS NOT NULL')
      .getMany();

    return makers.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      avatarUrl: u.avatarUrl ?? null,
      bio: u.bio ?? null,
      location: u.location ?? null,
      latitude: Number(u.latitude),
      longitude: Number(u.longitude),
    }));
  }

  /**
   * Obtiene el perfil público de un usuario (maker)
   * Carga solo información pública y relaciones públicas (printers, projects)
   */
  async findPublicFilaments(makerId: string) {
    const user = await this.userRepository.findOne({
      where: { id: makerId },
      relations: ['filaments'],
    });
    if (!user) throw new NotFoundException(`Maker with ID ${makerId} not found`);

    return (user.filaments || [])
      .filter((f) => f.isPublic)
      .map((f) => ({
        id: f.id,
        brand: f.brand,
        material: f.material,
        color: f.color,
        colorHex: f.colorHex,
        remainingWeight: f.remainingWeight,
        totalWeight: f.totalWeight,
        status: f.status,
        imageUrl: f.imageUrl,
      }));
  }

  async findPublicProfile(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['printers', 'projects'],
      select: [
        'id',
        'fullName',
        'avatarUrl',
        'bio',
        'location',
        'latitude',
        'longitude',
        'website',
        'tiktok',
        'instagram',
        'facebook',
        'youtube',
        'twitter',
        'customLinks',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Filtrar solo campos públicos de printers
    const publicPrinters = (user.printers || []).map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      model: p.model,
      type: p.type,
      status: p.status,
      imageUrl: p.imageUrl,
    }));

    // Filtrar solo proyectos públicos
    const publicProjects = (user.projects || [])
      .filter((p) => p.isPublic)
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        imageUrl: p.imageUrl,
        estimatedWeight: p.estimatedWeight,
        estimatedTime: p.estimatedTime,
      }));

    return {
      id: user.id,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      latitude: user.latitude ? Number(user.latitude) : null,
      longitude: user.longitude ? Number(user.longitude) : null,
      website: user.website,
      tiktok: user.tiktok,
      instagram: user.instagram,
      facebook: user.facebook,
      youtube: user.youtube,
      twitter: user.twitter,
      customLinks: user.customLinks,
      printers: publicPrinters,
      projects: publicProjects,
    };
  }
}
