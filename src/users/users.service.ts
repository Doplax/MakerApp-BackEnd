import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { User } from './entities/user.entity.js';
import { Filament } from '../filaments/entities/filament.entity.js';
import { PrintLog } from '../print-logs/entities/print-log.entity.js';
import { PrintStatus, UserRole } from '../common/enums/index.js';
import { MakerReviewsService } from '../maker-reviews/maker-reviews.service.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Filament)
    private readonly filamentRepository: Repository<Filament>,
    @InjectRepository(PrintLog)
    private readonly printLogRepository: Repository<PrintLog>,
    @Inject(forwardRef(() => MakerReviewsService))
    private readonly makerReviewsService: MakerReviewsService,
    private readonly cloudinary: CloudinaryService,
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

  /**
   * Convierte un CLIENTE (`user`) en MAKER (self-service, "Crea tu taller").
   * Solo aplica al rol `user`: un admin no se toca (no reutilizamos `update()`
   * administrativo para no arrastrar las guardas anti-lockout ni permitir setear
   * un rol arbitrario). Idempotente si ya es maker.
   */
  async upgradeToMaker(userId: string): Promise<User> {
    const user = await this.findOne(userId);
    if (user.role === UserRole.USER) {
      user.role = UserRole.MAKER;
      await this.userRepository.save(user);
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
    /** Tipo de cuenta elegido en el registro; solo aplica al CREAR. */
    intent?: 'user' | 'maker';
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
      user.googleEmail = profile.email.toLowerCase();
      if (!user.avatarUrl && profile.avatarUrl) {
        user.avatarUrl = profile.avatarUrl;
      }
      return this.userRepository.save(user);
    }

    // 3. Create new user (no password needed for Google users). El intent del
    // registro decide cliente/maker; sin intent → cliente (default). NUNCA admin,
    // y a un usuario existente jamás se le toca el rol por esta vía.
    const newUser = this.userRepository.create({
      googleId: profile.googleId,
      googleEmail: profile.email.toLowerCase(),
      email: profile.email.toLowerCase(),
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
      role: profile.intent === 'maker' ? UserRole.MAKER : UserRole.USER,
    });

    const saved = await this.userRepository.save(newUser);
    this.logger.log(`Google user created: ${saved.email}`);
    return saved;
  }

  /**
   * Vincula una cuenta de Google al usuario YA LOGUEADO (botón de Ajustes).
   * Cubre el caso de emails distintos (el mismo email se auto-vincula en el
   * login). Si ese Google ya pertenece a OTRA cuenta → ConflictException
   * (nunca se "roba" una identidad ya usada). No toca rol ni email.
   */
  async linkGoogleAccount(
    userId: string,
    profile: { googleId: string; email: string },
  ): Promise<User> {
    const existing = await this.findByGoogleId(profile.googleId);
    if (existing && existing.id !== userId) {
      throw new ConflictException(
        'Esa cuenta de Google ya está vinculada a otro usuario',
      );
    }
    const user = await this.findOne(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.googleId = profile.googleId;
    user.googleEmail = profile.email.toLowerCase();
    const saved = await this.userRepository.save(user);
    this.logger.log(`Google vinculado a ${saved.email} (${profile.email})`);
    return saved;
  }

  /**
   * Edición ADMINISTRATIVA de un usuario. `actorId` = id del admin que hace la
   * petición, para las guardas anti-lockout (no puede autoexpulsarse ni dejar la
   * plataforma sin ningún administrador activo).
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    actorId: string,
  ): Promise<User> {
    const user = await this.findOne(id);
    const oldAvatarUrl = user.avatarUrl;

    if (updateUserDto.email) {
      const email = updateUserDto.email.toLowerCase();
      updateUserDto.email = email;
      // Unicidad: sin este check un email duplicado revienta con 500 (violación
      // de la constraint UNIQUE) en vez de un 400 con mensaje útil.
      if (email !== user.email) {
        const clash = await this.userRepository.findOne({ where: { email } });
        if (clash && clash.id !== id) {
          throw new BadRequestException(
            `Ya existe un usuario con el email ${updateUserDto.email}`,
          );
        }
      }
    }

    // No puedes desactivarte ni quitarte a ti mismo el rol de admin: la estrategia
    // JWT rechaza inactivos/no-admin en la siguiente petición → autoexpulsión.
    if (id === actorId) {
      if (updateUserDto.isActive === false) {
        throw new BadRequestException('No puedes desactivar tu propia cuenta');
      }
      if (
        updateUserDto.role !== undefined &&
        updateUserDto.role !== UserRole.ADMIN
      ) {
        throw new BadRequestException(
          'No puedes quitarte a ti mismo el rol de administrador',
        );
      }
    }

    // Debe quedar SIEMPRE al menos un administrador activo: si este cambio deja a
    // un admin activo sin serlo (desactivación o cambio de rol), verifica que hay otro.
    const willBeActive = updateUserDto.isActive ?? user.isActive;
    const willBeAdmin = (updateUserDto.role ?? user.role) === UserRole.ADMIN;
    const wasActiveAdmin = user.isActive && user.role === UserRole.ADMIN;
    if (wasActiveAdmin && !(willBeActive && willBeAdmin)) {
      await this.assertNotLastActiveAdmin(id);
    }

    Object.assign(user, updateUserDto);
    const saved = await this.userRepository.save(user);
    if (oldAvatarUrl && oldAvatarUrl !== saved.avatarUrl) {
      await this.cloudinary.deleteByUrl(oldAvatarUrl);
    }
    return saved;
  }

  /** Lanza si `id` es el ÚNICO administrador activo que quedaría. */
  private async assertNotLastActiveAdmin(id: string): Promise<void> {
    const otherActiveAdmins = await this.userRepository.count({
      where: { role: UserRole.ADMIN, isActive: true, id: Not(id) },
    });
    if (otherActiveAdmins === 0) {
      throw new BadRequestException(
        'Debe quedar al menos un administrador activo en la plataforma',
      );
    }
  }

  /**
   * "Borrado" de usuario = SOFT-DELETE (desactivación), NO borrado físico.
   *
   * Un DELETE real fallaría por las FK `createdBy` (proyectos/filamentos/impresoras/
   * print-logs no tienen onDelete) o, si se forzara con CASCADE, dejaría ficheros
   * huérfanos en el volumen y borraría facturas/compras (registros fiscales). En su
   * lugar desactivamos la cuenta (`isActive=false`): el login queda bloqueado
   * (auth.service comprueba `isActive`) y se conservan datos, ficheros y facturas.
   * Es reversible reactivando `isActive` desde el panel de admin (PATCH /users/:id).
   */
  async remove(id: string, actorId: string): Promise<{ message: string }> {
    const user = await this.findOne(id); // lanza NotFound si no existe
    // Un admin no puede desactivarse a sí mismo (autoexpulsión) ni dejar la
    // plataforma sin ningún administrador activo.
    if (id === actorId) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }
    if (user.isActive && user.role === UserRole.ADMIN) {
      await this.assertNotLastActiveAdmin(id);
    }
    if (user.isActive) {
      await this.userRepository.update(id, { isActive: false });
      this.logger.log(`User deactivated (soft-delete): ${user.email}`);
    }
    return { message: `User ${user.email} has been deactivated` };
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findOne(id);
    const oldAvatarUrl = user.avatarUrl;
    const oldInvoiceLogoUrl = user.invoiceLogoUrl;

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

    // Borrar del almacenamiento el avatar/logo antiguo si fueron reemplazados
    if (oldAvatarUrl && oldAvatarUrl !== saved.avatarUrl) {
      await this.cloudinary.deleteByUrl(oldAvatarUrl);
    }
    if (oldInvoiceLogoUrl && oldInvoiceLogoUrl !== saved.invoiceLogoUrl) {
      await this.cloudinary.deleteByUrl(oldInvoiceLogoUrl);
    }

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
      isAvailable: boolean;
      ratingAverage: number;
      ratingCount: number;
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
        'u.isAvailable',
      ])
      .where('u.isActive = :active', { active: true })
      // Solo makers/admin en el mapa: un cliente (rol 'user') no es un taller
      // aunque tenga coordenadas, así que no debe aparecer.
      .andWhere('u.role IN (:...roles)', {
        roles: [UserRole.MAKER, UserRole.ADMIN],
      })
      .andWhere('u.latitude IS NOT NULL')
      .andWhere('u.longitude IS NOT NULL')
      .getMany();

    // Rating de todos los makers en una sola consulta agregada: la tarjeta
    // del mapa (in-app y landing) muestra "★ 4,9 (128)" junto al nombre.
    const ratings = await this.makerReviewsService.getRatingSummaries(
      makers.map((u) => u.id),
    );

    return makers.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      avatarUrl: u.avatarUrl ?? null,
      bio: u.bio ?? null,
      location: u.location ?? null,
      latitude: Number(u.latitude),
      longitude: Number(u.longitude),
      hideDirectionsButton: !!u.hideDirectionsButton,
      // Coalesce a true: en dev (synchronize) las filas previas pueden venir
      // sin valor; el comportamiento histórico es "disponible".
      isAvailable: u.isAvailable !== false,
      ratingAverage: ratings.get(u.id)?.average ?? 0,
      ratingCount: ratings.get(u.id)?.count ?? 0,
    }));
  }

  /**
   * Obtiene el perfil público de un usuario (maker)
   * Carga solo información pública y relaciones públicas (printers, projects)
   */
  /**
   * Garantiza que `id` es un usuario con perfil público de maker (maker/admin).
   * Un CLIENTE (o un maker degradado a cliente por el admin) no debe exponer
   * NADA por los endpoints públicos: sin esto, sus proyectos seguirían
   * accesibles (y comprables) por URL directa aunque su perfil dé 404.
   */
  private async assertMakerVisible(id: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'role'],
    });
    if (!user || user.role === UserRole.USER) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async findPublicFilaments(makerId: string) {
    await this.assertMakerVisible(makerId);
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
        'role',
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

    // Un cliente (rol 'user') no tiene perfil público de maker → 404.
    if (!user || user.role === UserRole.USER) {
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
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [rating, publicFilamentEntities, printAgg] = await Promise.all([
      this.makerReviewsService.getMakerRatingSummary(user.id),
      this.filamentRepository.find({
        where: { createdBy: { id: user.id }, isPublic: true },
        order: { createdAt: 'DESC' },
      }),
      this.printLogRepository
        .createQueryBuilder('pl')
        .select('COALESCE(SUM(pl.printDuration), 0)', 'minutes')
        .where('pl.createdBy = :userId', { userId: user.id })
        .andWhere('pl.status = :status', { status: PrintStatus.COMPLETED })
        .andWhere('pl.updatedAt >= :since', { since })
        .getRawOne<{ minutes: string }>(),
    ]);

    const monthlyPrintHours = printAgg?.minutes
      ? Math.round((parseFloat(printAgg.minutes) / 60) * 10) / 10
      : 0;

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
      monthlyPrintHours,
      isAvailable: user.isAvailable !== false,
    };
  }

  /** Lista de proyectos públicos de un maker (para la página de proyectos disponibles). */
  async findPublicProjects(makerId: string) {
    const user = await this.userRepository.findOne({
      where: { id: makerId },
      relations: ['projects'],
    });
    // Un cliente no tiene proyectos públicos de maker (ver assertMakerVisible).
    if (!user || user.role === UserRole.USER) {
      throw new NotFoundException(`Maker with ID ${makerId} not found`);
    }

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
    // Un cliente no expone proyectos comprables (ver assertMakerVisible).
    if (!user || user.role === UserRole.USER) {
      throw new NotFoundException(`Maker with ID ${makerId} not found`);
    }

    const project = (user.projects || []).find(
      (p) => p.id === projectId && p.isPublic,
    );
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Reputación del maker junto a su nombre en la ficha del producto.
    const rating = await this.makerReviewsService.getMakerRatingSummary(user.id);

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
      // Redes del proyecto (reel/publicación del proceso; solo se pintan si hay enlace).
      instagramUrl: project.instagramUrl ?? null,
      tiktokUrl: project.tiktokUrl ?? null,
      youtubeUrl: project.youtubeUrl ?? null,
      maker: {
        id: user.id,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        ratingAverage: rating.average,
        ratingCount: rating.count,
        // El comprador puede pagar online solo si el maker completó el onboarding
        // de Stripe (chargesEnabled), no solo si existe la cuenta.
        acceptsPayments: !!user.stripeAccountId && !!user.chargesEnabled,
      },
    };
  }
}
