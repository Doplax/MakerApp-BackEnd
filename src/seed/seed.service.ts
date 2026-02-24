import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Filament } from '../filaments/entities/filament.entity.js';
import { Printer } from '../printers/entities/printer.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { PrintLog } from '../print-logs/entities/print-log.entity.js';
import { User } from '../users/entities/user.entity.js';
import { usersToSeed } from './data/users.seed.js';
import { filamentsToSeed } from './data/filaments.seed.js';
import { printersToSeed } from './data/printers.seed.js';
import { projectsToSeed } from './data/projects.seed.js';
import { printLogsToSeed } from './data/print-logs.seed.js';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Filament)
    private readonly filamentRepository: Repository<Filament>,
    @InjectRepository(Printer)
    private readonly printerRepository: Repository<Printer>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(PrintLog)
    private readonly printLogRepository: Repository<PrintLog>,
  ) {}

  async executeSeed() {
    // Limpiar datos existentes (order matters due to foreign keys)
    await this.printLogRepository.createQueryBuilder().delete().execute();
    await this.filamentRepository.createQueryBuilder().delete().execute();
    await this.printerRepository.createQueryBuilder().delete().execute();
    await this.projectRepository.createQueryBuilder().delete().execute();
    await this.userRepository.createQueryBuilder().delete().execute();

    // Crear usuarios desde seed data
    const savedUsers: User[] = [];
    for (const userData of usersToSeed) {
      const user = this.userRepository.create(userData);
      savedUsers.push(await this.userRepository.save(user));
    }

    // El primer usuario (demo) es el owner de los recursos
    const demoUser = savedUsers[0];

    // Crear filamentos
    const savedFilaments: Filament[] = [];
    for (const data of filamentsToSeed) {
      const filament = this.filamentRepository.create({
        ...data,
        createdBy: demoUser,
      });
      savedFilaments.push(await this.filamentRepository.save(filament));
    }

    // Crear impresoras
    const savedPrinters: Printer[] = [];
    for (const data of printersToSeed) {
      const printer = this.printerRepository.create({
        ...data,
        createdBy: demoUser,
      });
      savedPrinters.push(await this.printerRepository.save(printer));
    }

    // Crear proyectos
    const savedProjects: Project[] = [];
    for (const data of projectsToSeed) {
      const project = this.projectRepository.create({
        ...data,
        createdBy: demoUser,
      });
      savedProjects.push(await this.projectRepository.save(project));
    }

    // Crear registros de impresión
    for (const data of printLogsToSeed) {
      const { filamentIndex, printerIndex, projectIndex, ...logData } = data;
      const printLog = this.printLogRepository.create({
        ...logData,
        filament: savedFilaments[filamentIndex],
        printer: savedPrinters[printerIndex],
        project:
          projectIndex !== undefined ? savedProjects[projectIndex] : undefined,
        createdBy: demoUser,
      });
      await this.printLogRepository.save(printLog);
    }

    this.logger.log('Seed executed successfully!');
    this.logger.log(
      `Created: ${savedUsers.length} users, ${savedFilaments.length} filaments, ${savedPrinters.length} printers, ${savedProjects.length} projects, ${printLogsToSeed.length} print logs`,
    );

    return {
      message: 'Seed executed successfully',
      data: {
        users: savedUsers.length,
        filaments: savedFilaments.length,
        printers: savedPrinters.length,
        projects: savedProjects.length,
        printLogs: printLogsToSeed.length,
      },
      credentials: usersToSeed.map((u) => ({
        email: u.email,
        password: u.password,
        role: u.role,
      })),
    };
  }
}
