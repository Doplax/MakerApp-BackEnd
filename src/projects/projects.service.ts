import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { Project } from './entities/project.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Filament } from '../filaments/entities/filament.entity.js';
import { Printer } from '../printers/entities/printer.entity.js';

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

  async findAll(user: User): Promise<Project[]> {
    return this.projectRepository.find({
      where: { createdBy: { id: user.id } },
      relations: ['filaments'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id, createdBy: { id: user.id } },
      relations: ['printLogs', 'filaments', 'printer'],
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    user: User,
  ): Promise<Project> {
    const project = await this.findOne(id, user);
    const { filamentIds, printerId, ...projectData } = updateProjectDto;

    Object.assign(project, projectData);

    if (printerId !== undefined) {
      if (printerId) {
        project.printer =
          (await this.printerRepository.findOne({
            where: { id: printerId, createdBy: { id: user.id } },
          })) || null;
      } else {
        project.printer = null;
      }
    }

    if (filamentIds !== undefined) {
      project.filaments = filamentIds.length
        ? await this.filamentRepository.findBy({
            id: In(filamentIds),
            createdBy: { id: user.id },
          })
        : [];
    }

    return this.projectRepository.save(project);
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const project = await this.findOne(id, user);
    await this.projectRepository.remove(project);
    return { message: `Project ${project.name} has been removed` };
  }
}
