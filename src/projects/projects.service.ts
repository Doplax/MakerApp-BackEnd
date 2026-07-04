import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { FindProjectsQueryDto } from './dto/find-projects-query.dto.js';
import { Project } from './entities/project.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Filament } from '../filaments/entities/filament.entity.js';
import { Printer } from '../printers/entities/printer.entity.js';
import { PrintLog } from '../print-logs/entities/print-log.entity.js';
import { PrintStatus } from '../common/enums/index.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';

/** Envoltorio de paginación (mismo shape que el resto de la API: print-logs, etc.). */
export interface PaginatedProjects {
  data: Project[];
  total: number;
  page: number;
  limit: number;
}

const DEFAULT_PAGE_SIZE = 10;
const DAY_MS = 86_400_000;

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Filament)
    private readonly filamentRepository: Repository<Filament>,
    @InjectRepository(Printer)
    private readonly printerRepository: Repository<Printer>,
    @InjectRepository(PrintLog)
    private readonly printLogRepository: Repository<PrintLog>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    user: User,
  ): Promise<Project> {
    const { filamentIds, printerId, ...projectData } = createProjectDto;

    const project = this.projectRepository.create({
      ...projectData,
      createdBy: user,
    });

    if (printerId) {
      project.printer = await this.printerRepository.findOne({
        where: { id: printerId, createdBy: { id: user.id } },
      });
    }

    if (filamentIds?.length) {
      project.filaments = await this.filamentRepository.findBy({
        id: In(filamentIds),
        createdBy: { id: user.id },
      });
    }

    const saved = await this.projectRepository.save(project);
    this.logger.log(`Project created: ${saved.name} by ${user.email}`);
    return saved;
  }

  /**
   * Lista los proyectos del usuario.
   *
   * Paginación **opt-in**: sin `page`/`limit` devuelve la lista COMPLETA (`Project[]`),
   * como siempre — de ella dependen el kanban, finanzas, ajustes y el detalle de
   * proyecto. Con `page` o `limit` devuelve el envoltorio `{ data, total, page, limit }`.
   */
  async findAll(
    user: User,
    query: FindProjectsQueryDto = {},
  ): Promise<Project[] | PaginatedProjects> {
    const wantsPagination =
      query.page !== undefined || query.limit !== undefined;

    const qb = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.filaments', 'filament')
      .leftJoinAndSelect('project.printer', 'printer')
      .leftJoinAndSelect('project.printLogs', 'printLog')
      .leftJoinAndSelect('printLog.filament', 'printLogFilament')
      .leftJoinAndSelect('printLog.printer', 'printLogPrinter')
      .where('project.createdBy = :userId', { userId: user.id });

    const cutoff = this.periodCutoff(query.period);
    if (cutoff) qb.andWhere('project.createdAt >= :cutoff', { cutoff });

    qb.orderBy('project.createdAt', 'DESC');

    if (!wantsPagination) {
      // Comportamiento histórico: lista completa con las impresiones ordenadas.
      return qb.addOrderBy('printLog.createdAt', 'DESC').getMany();
    }

    // Paginación: ordenamos SOLO por columnas de la raíz (createdAt + id como
    // desempate estable). `filaments` y `printLogs` son relaciones "to-many", así que
    // TypeORM pagina por ids distintos; ordenar por columnas de un join rompería el
    // SELECT DISTINCT en Postgres.
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : DEFAULT_PAGE_SIZE;

    const [data, total] = await qb
      .addOrderBy('project.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  /** Fecha de corte para el filtro por antigüedad (null = sin filtro). */
  private periodCutoff(period?: 'all' | 'week' | 'month'): Date | null {
    if (!period || period === 'all') return null;
    const ms = period === 'week' ? 7 * DAY_MS : 30 * DAY_MS;
    return new Date(Date.now() - ms);
  }

  async findOne(id: string, user: User): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id, createdBy: { id: user.id } },
      relations: [
        'printLogs',
        'printLogs.filament',
        'printLogs.printer',
        'filaments',
        'printer',
      ],
    });
    if (!project)
      throw new NotFoundException(`Project with ID ${id} not found`);
    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    user: User,
  ): Promise<Project> {
    const project = await this.findOne(id, user);
    const oldImageUrl = project.imageUrl;
    const oldLicenseFileUrl = project.licenseFileUrl;

    // Extraemos las relaciones para tratarlas por separado
    const { filamentIds, printerId, ...projectData } = updateProjectDto;

    // 1. Actualizamos todos los datos de texto/números directos
    Object.assign(project, projectData);

    // 2. Actualizamos la impresora recomendada (si se envía)
    if (printerId !== undefined) {
      project.printer = printerId
        ? ((await this.printerRepository.findOne({
            where: { id: printerId, createdBy: { id: user.id } },
          })) ?? null)
        : null;
    }

    // 3. Actualizamos los filamentos (si se envían)
    if (filamentIds !== undefined) {
      project.filaments = filamentIds.length
        ? await this.filamentRepository.findBy({
            id: In(filamentIds),
            createdBy: { id: user.id },
          })
        : [];
    }

    // 4. Guardamos la plantilla del proyecto
    await this.projectRepository.save(project);

    // 4b. Si se reemplazó la imagen o la licencia, borramos el fichero antiguo
    // del almacenamiento (deleteByUrl ignora URLs que no son de /uploads).
    if (oldImageUrl && oldImageUrl !== project.imageUrl) {
      await this.cloudinary.deleteByUrl(oldImageUrl);
    }
    if (oldLicenseFileUrl && oldLicenseFileUrl !== project.licenseFileUrl) {
      await this.cloudinary.deleteByUrl(oldLicenseFileUrl);
    }

    // 5. Devolvemos el proyecto actualizado (con sus relaciones cargadas)
    return this.findOne(project.id, user);
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const project = await this.findOne(id, user);
    const { imageUrl, licenseFileUrl } = project;
    await this.projectRepository.remove(project);
    // Borramos del almacenamiento la imagen y la licencia asociadas (si las había)
    if (imageUrl) await this.cloudinary.deleteByUrl(imageUrl);
    if (licenseFileUrl) await this.cloudinary.deleteByUrl(licenseFileUrl);
    return { message: `Project ${project.name} has been removed` };
  }
}
