import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePrintLogDto } from './dto/create-print-log.dto.js';
import { UpdatePrintLogDto } from './dto/update-print-log.dto.js';
import { PrintLog } from './entities/print-log.entity.js';
import { PrintStatus } from '../common/enums/index.js';
import { Filament } from '../filaments/entities/filament.entity.js';
import { FilamentsService } from '../filaments/filaments.service.js';
import { Printer } from '../printers/entities/printer.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class PrintLogsService {
  private readonly logger = new Logger(PrintLogsService.name);

  constructor(
    @InjectRepository(PrintLog)
    private readonly printLogRepository: Repository<PrintLog>,
    private readonly filamentsService: FilamentsService,
  ) {}

  async create(
    createPrintLogDto: CreatePrintLogDto,
    user: User,
  ): Promise<PrintLog> {
    const { filamentId, printerId, projectId, ...logData } = createPrintLogDto;

    // Verificar que el filamento existe y pertenece al usuario
    const filament = await this.filamentsService.findOne(filamentId, user);

    if (filament.remainingWeight < createPrintLogDto.weightUsed) {
      throw new BadRequestException(
        `Not enough filament. Available: ${filament.remainingWeight}g, Requested: ${createPrintLogDto.weightUsed}g`,
      );
    }

    const printLog = this.printLogRepository.create({
      ...logData,
      filament: { id: filamentId },
      printer: printerId ? { id: printerId } : undefined,
      project: projectId ? { id: projectId } : undefined,
      createdBy: user,
    });

    const saved = await this.printLogRepository.save(printLog);

    // Descontar peso del filamento automáticamente
    await this.filamentsService.deductWeight(
      filamentId,
      createPrintLogDto.weightUsed,
    );

    this.logger.log(
      `Print log created: ${saved.name} - ${createPrintLogDto.weightUsed}g used from ${filament.brand} ${filament.color}`,
    );

    return this.findOne(saved.id, user);
  }

  async findAll(user: User): Promise<PrintLog[]> {
    return this.printLogRepository.find({
      where: { createdBy: { id: user.id } },
      relations: ['filament', 'printer', 'project'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByFilament(filamentId: string, user: User): Promise<PrintLog[]> {
    return this.printLogRepository.find({
      where: {
        filament: { id: filamentId },
        createdBy: { id: user.id },
      },
      relations: ['filament', 'printer', 'project'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByPrinter(printerId: string, user: User): Promise<PrintLog[]> {
    return this.printLogRepository.find({
      where: {
        printer: { id: printerId },
        createdBy: { id: user.id },
      },
      relations: ['filament', 'printer', 'project'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProject(projectId: string, user: User): Promise<PrintLog[]> {
    return this.printLogRepository.find({
      where: {
        project: { id: projectId },
        createdBy: { id: user.id },
      },
      relations: ['filament', 'printer', 'project'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<PrintLog> {
    const printLog = await this.printLogRepository.findOne({
      where: { id, createdBy: { id: user.id } },
      relations: ['filament', 'printer', 'project'],
    });

    if (!printLog) {
      throw new NotFoundException(`Print log with ID ${id} not found`);
    }

    return printLog;
  }

  async update(
    id: string,
    updatePrintLogDto: UpdatePrintLogDto,
    user: User,
  ): Promise<PrintLog> {
    const printLog = await this.findOne(id, user);
    const { filamentId, printerId, projectId, ...logData } = updatePrintLogDto;

    // Si cambió el peso, ajustar el filamento
    if (
      updatePrintLogDto.weightUsed !== undefined &&
      updatePrintLogDto.weightUsed !== printLog.weightUsed &&
      printLog.filament
    ) {
      const diff = updatePrintLogDto.weightUsed - printLog.weightUsed;
      if (diff > 0) {
        await this.filamentsService.deductWeight(printLog.filament.id, diff);
      } else {
        await this.filamentsService.restoreWeight(
          printLog.filament.id,
          Math.abs(diff),
        );
      }
    }

    Object.assign(printLog, logData);
    if (filamentId) printLog.filament = { id: filamentId } as Filament;
    if (printerId) printLog.printer = { id: printerId } as Printer;
    if (projectId) printLog.project = { id: projectId } as Project;

    if (
      updatePrintLogDto.status === PrintStatus.IN_PROGRESS &&
      !printLog.printStartedAt
    ) {
      printLog.printStartedAt = new Date();
    }

    return this.printLogRepository.save(printLog);
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const printLog = await this.findOne(id, user);

    // Restaurar el peso al filamento
    if (printLog.filament) {
      await this.filamentsService.restoreWeight(
        printLog.filament.id,
        printLog.weightUsed,
      );
    }

    await this.printLogRepository.remove(printLog);
    this.logger.log(
      `Print log removed: ${printLog.name} - ${printLog.weightUsed}g restored to filament`,
    );

    return {
      message: `Print log ${printLog.name} has been removed and weight restored`,
    };
  }
}
