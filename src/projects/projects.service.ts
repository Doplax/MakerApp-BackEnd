import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { Project } from './entities/project.entity.js';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    user: User,
  ): Promise<Project> {
    const project = this.projectRepository.create({
      ...createProjectDto,
      createdBy: user,
    });
    const saved = await this.projectRepository.save(project);
    this.logger.log(`Project created: ${saved.name} by ${user.email}`);
    return saved;
  }

  async findAll(user: User): Promise<Project[]> {
    return this.projectRepository.find({
      where: { createdBy: { id: user.id } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id, createdBy: { id: user.id } },
      relations: ['printLogs'],
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
    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const project = await this.findOne(id, user);
    await this.projectRepository.remove(project);
    return { message: `Project ${project.name} has been removed` };
  }
}
