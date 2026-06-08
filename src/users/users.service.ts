import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { User } from './entities/user.entity.js';
import { Filament } from '../filaments/entities/filament.entity.js';
import { MakerReviewsService } from '../maker-reviews/maker-reviews.service.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Filament)
    private readonly filamentRepository: Repository<Filament>,
    @Inject(forwardRef(() => MakerReviewsService))
    private readonly makerReviewsService: MakerReviewsService,
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

    // Si se está fijando un proyecto destacado, validar que pertenezca al usuario
    // y sea público (si es null/undefined se permite limpiar el destacado).
    if (dto.featuredProjectId) {
      const exists = await this.userRepository.manager
        .createQueryBuilder()
        .select('p.id', 'id')
        .addSelect('p.isPublic', 'isPublic')
        .addSelect('p.createdById', 'createdById')
        .from('projects', 'p')
        .where('p.id = :id', { id: dto.featuredProjectId })
        .getRawOne<{ id: string; isPublic: boolean; createdById: string }>();

      if (!exists || exists.createdById !== id) {
        throw new BadRequestException(
          'El proyecto destacado no existe o no te pertenece',
        );
      }
      if (!exists.isPublic) {
        throw new BadRequestException(
          'El proyecto destacado debe ser público',
        );
      }
    }

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
   * Guarda el hash del token de reset + expiración usando update() para
   * evitar que dispare el hook @BeforeUpdate (que re-hashearía la contraseña).
   */
  async setPasswordResetToken(
    userId: string,
    hashedToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      passwordResetToken: hashedToken,
      passwordResetExpiresAt: expiresAt,
    });
  }

  /**
   * Busca un usuario activo a partir del hash del token de recuperación.
   * Devuelve null si no existe o si el token ha expirado.
   */
  async findByPasswordResetToken(
    hashedToken: string,
  ): Promise<{ id: string; email: string } | null> {
    const user = await this.userRepository.findOne({
      where: { passwordResetToken: hashedToken },
      select: ['id', 'email', 'isActive', 'passwordResetExpiresAt'],
    });

    if (!user || !user.isActive) return null;
    if (
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      return null;
    }
    return { id: user.id, email: user.email };
  }

  /**
   * Establece una nueva contraseña y limpia el token de reset.
   * Carga el password column para que el hook @BeforeUpdate la hashee.
   */
  async resetPasswordWithToken(
    userId: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });
    if (!user) throw new NotFoundException('User not found');

    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await this.userRepository.save(user);
    this.logger.log(`Password reset for user ${userId}`);
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
      hideDirectionsButton: boolean;
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
        'u.hideDirectionsButton',
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
      hideDirectionsButton: !!u.hideDirectionsButton,
    }));
  }

  /**
   * Obtiene el perfil público de un usuario (maker)
   * Carga solo información pública y relaciones públicas (printers, projects)
   */
  async findPublicFilaments(makerId: string) {
    // Consultamos los filamentos directamente por createdBy + isPublic, igual
    // que el contador de findPublicProfile. Antes se cargaba la relación
    // user.filaments y se filtraba en memoria, lo que podía devolver vacío
    // mientras el contador (vía filamentRepository) sí los encontraba.
    const filaments = await this.filamentRepository.find({
      where: { createdBy: { id: makerId }, isPublic: true },
      order: { createdAt: 'DESC' },
    });

    return filaments.map((f) => ({
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
        'featuredProjectId',
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
        imageUrl: p.imageUrl,
        estimatedWeight: p.estimatedWeight,
        estimatedTime: p.estimatedTime,
        price: p.price,
      }));

    // Incluimos los filamentos públicos en el propio perfil (igual que printers
    // y projects) para que el frontend no tenga que hacer una petición aparte
    // (la que dejaba el loader colgado y la sección sin cards).
    const [rating, publicFilamentEntities] = await Promise.all([
      this.makerReviewsService.getMakerRatingSummary(user.id),
      this.filamentRepository.find({
        where: { createdBy: { id: user.id }, isPublic: true },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const filaments = publicFilamentEntities.map((f) => ({
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
      featuredProjectId: user.featuredProjectId,
      printers: publicPrinters,
      projects: publicProjects,
      filaments,
      filamentCount: filaments.length,
      ratingAverage: rating.average,
      ratingCount: rating.count,
    };
  }

  /** Lista de proyectos públicos de un maker (para la página de proyectos disponibles). */
  async findPublicProjects(makerId: string) {
    const user = await this.userRepository.findOne({
      where: { id: makerId },
      relations: ['projects'],
    });
    if (!user) throw new NotFoundException(`Maker with ID ${makerId} not found`);

    return (user.projects || [])
      .filter((p) => p.isPublic)
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        estimatedWeight: p.estimatedWeight,
        estimatedTime: p.estimatedTime,
        price: p.price,
      }));
  }

  /** Detalle de un proyecto público concreto + datos básicos del maker. */
  async findPublicProject(makerId: string, projectId: string) {
    const user = await this.userRepository.findOne({
      where: { id: makerId },
      relations: ['projects', 'projects.filaments'],
    });
    if (!user) throw new NotFoundException(`Maker with ID ${makerId} not found`);

    const project = (user.projects || []).find(
      (p) => p.id === projectId && p.isPublic,
    );
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      imageUrl: project.imageUrl,
      estimatedWeight: project.estimatedWeight,
      estimatedTime: project.estimatedTime,
      price: project.price,
      designType: project.designType,
      material: project.filaments?.[0]?.material ?? null,
      maker: {
        id: user.id,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
    };
  }
}
