import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { Project } from './entities/project.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Filament } from '../filaments/entities/filament.entity.js';
import { Printer } from '../printers/entities/printer.entity.js';
import { PrintLog } from '../print-logs/entities/print-log.entity.js';
import { PrintStatus } from '../common/enums/index.js';

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
  ) {}

  async create(createProjectDto: CreateProjectDto, user: User): Promise<Project> {
    const { filamentIds, printerId, ...projectData } = createProjectDto;

    const project = this.projectRepository.create({ ...projectData, createdBy: user });

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

  async findAll(user: User): Promise<Project[]> {
    return this.projectRepository.find({
      where: { createdBy: { id: user.id } },
      relations: ['filaments', 'printer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id, createdBy: { id: user.id } },
      relations: ['printLogs', 'printLogs.filament', 'printLogs.printer', 'filaments', 'printer'],
    });
    if (!project) throw new NotFoundException(`Project with ID ${id} not found`);
    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, user: User): Promise<Project> {
    const project = await this.findOne(id, user);
    const oldKanbanStatus = project.kanbanStatus;

    const { filamentIds, printerId, cancelPrint, ...projectData } = updateProjectDto;

    Object.assign(project, projectData);

    if (printerId !== undefined) {
      project.printer = printerId
        ? ((await this.printerRepository.findOne({ where: { id: printerId, createdBy: { id: user.id } } })) ?? null)
        : null;
    }

    if (filamentIds !== undefined) {
      project.filaments = filamentIds.length
        ? await this.filamentRepository.findBy({ id: In(filamentIds), createdBy: { id: user.id } })
        : [];
    }

    const newKanbanStatus = project.kanbanStatus;

    // ── IN_PROGRESS: crear PrintLog activo ──────────────────────
    if (oldKanbanStatus !== 'in_progress' && newKanbanStatus === 'in_progress' && project.printer) {
      project.printer.status = 'printing';
      await this.printerRepository.save(project.printer);

      const filament = project.filaments?.[0] ?? null;
      if (filament) {
        await this.printLogRepository.save(
          this.printLogRepository.create({
            name: `Impresión: ${project.name}`,
            description: null as unknown as string,
            weightUsed: 0,
            printDuration: project.estimatedTime ?? 0,
            status: PrintStatus.IN_PROGRESS,
            printStartedAt: new Date(),
            createdBy: user,
            printer: project.printer,
            project: project,
            filament: filament,
          }),
        );
      }
    }

    // ── PENDING (desde in_progress): cancelar o revertir ────────
    if (oldKanbanStatus === 'in_progress' && newKanbanStatus === 'pending') {
      if (project.printer) {
        project.printer.status = 'idle';
        await this.printerRepository.save(project.printer);
      }

      const activeLog = await this.printLogRepository.findOne({
        where: { project: { id: project.id }, status: PrintStatus.IN_PROGRESS },
        relations: ['filament'],
      });

      if (cancelPrint && activeLog) {
        const weight = project.estimatedWeight ?? 0;
        activeLog.status = PrintStatus.CANCELLED;
        activeLog.weightUsed = weight;
        await this.printLogRepository.save(activeLog);

        if (weight > 0 && activeLog.filament) {
          activeLog.filament.remainingWeight = Math.max(0, activeLog.filament.remainingWeight - weight);
          await this.filamentRepository.save(activeLog.filament);
        }
      } else if (activeLog) {
        await this.printLogRepository.remove(activeLog);
      }
    }

    // ── DONE: cerrar PrintLog como completado ────────────────────
    if (oldKanbanStatus !== 'done' && newKanbanStatus === 'done') {
      if (project.printer) {
        project.printer.status = 'idle';
        await this.printerRepository.save(project.printer);
      }

      const activeLog = await this.printLogRepository.findOne({
        where: { project: { id: project.id }, status: PrintStatus.IN_PROGRESS },
        relations: ['filament'],
      });

      const weight = project.estimatedWeight ?? 0;
      const filament = activeLog?.filament ?? project.filaments?.[0] ?? null;

      if (activeLog) {
        activeLog.status = PrintStatus.COMPLETED;
        activeLog.weightUsed = weight;
        await this.printLogRepository.save(activeLog);
      } else if (filament && project.printer) {
        await this.printLogRepository.save(
          this.printLogRepository.create({
            name: `Impresión: ${project.name}`,
            description: 'Log generado al completar proyecto',
            weightUsed: weight,
            printDuration: project.estimatedTime ?? 0,
            status: PrintStatus.COMPLETED,
            printStartedAt: null as unknown as Date,
            createdBy: user,
            printer: project.printer,
            project: project,
            filament: filament,
          }),
        );
      }

      if (weight > 0 && filament) {
        const fresh = await this.filamentRepository.findOne({ where: { id: filament.id } });
        if (fresh) {
          fresh.remainingWeight = Math.max(0, fresh.remainingWeight - weight);
          await this.filamentRepository.save(fresh);
        }
      }
    }

    return this.projectRepository.save(project);
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const project = await this.findOne(id, user);
    await this.projectRepository.remove(project);
    return { message: `Project ${project.name} has been removed` };
  }
}
