import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePrinterDto } from './dto/create-printer.dto.js';
import { UpdatePrinterDto } from './dto/update-printer.dto.js';
import { Printer } from './entities/printer.entity.js';
import { User } from '../users/entities/user.entity.js';

export interface MaintenanceDueItem {
  printerId: string;
  printerName: string;
  type: 'simple' | 'full';
  hoursSince: number;
  threshold: number;
  lastMaintenanceAt: Date | null;
}

type PrinterWithHours = Printer & {
  totalPrintHours: number;
  hoursSinceSimpleMaintenance: number;
  hoursSinceFullMaintenance: number;
};

@Injectable()
export class PrintersService {
  private readonly logger = new Logger(PrintersService.name);

  constructor(
    @InjectRepository(Printer)
    private readonly printerRepository: Repository<Printer>,
  ) {}

  async create(
    createPrinterDto: CreatePrinterDto,
    user: User,
  ): Promise<Printer> {
    const printer = this.printerRepository.create({
      ...createPrinterDto,
      createdBy: user,
    });
    const saved = await this.printerRepository.save(printer);
    this.logger.log(`Printer created: ${saved.name} by ${user.email}`);
    return saved;
  }

  async findAll(user: User): Promise<PrinterWithHours[]> {
    const printers = await this.printerRepository.find({
      where: { createdBy: { id: user.id } },
      relations: ['printLogs'],
      order: { createdAt: 'DESC' },
    });
    return printers.map((p) => this.withHours(p));
  }

  async findOne(id: string, user: User): Promise<PrinterWithHours> {
    const printer = await this.printerRepository.findOne({
      where: { id, createdBy: { id: user.id } },
      relations: ['printLogs'],
    });
    if (!printer) {
      throw new NotFoundException(`Printer with ID ${id} not found`);
    }
    return this.withHours(printer);
  }

  /** Horas impresas desde una fecha dada (o de toda la vida si no hay fecha). */
  private printHoursSince(printer: Printer, since: Date | null): number {
    const logs = printer.printLogs ?? [];
    const minutes = logs
      .filter((l) => {
        if (!l.printDuration) return false;
        if (!since) return true;
        const when = l.printStartedAt ?? l.createdAt;
        return when ? new Date(when) > new Date(since) : true;
      })
      .reduce((sum, l) => sum + (l.printDuration ?? 0), 0);
    return Math.round(minutes / 60);
  }

  private withHours(printer: Printer): PrinterWithHours {
    return Object.assign(printer, {
      totalPrintHours: this.printHoursSince(printer, null),
      hoursSinceSimpleMaintenance: this.printHoursSince(
        printer,
        printer.lastMaintenanceSimpleAt ?? null,
      ),
      hoursSinceFullMaintenance: this.printHoursSince(
        printer,
        printer.lastMaintenanceFullAt ?? null,
      ),
    });
  }

  /**
   * Devuelve las impresoras del usuario cuyo mantenimiento (básico y/o completo)
   * ha alcanzado o superado su umbral de horas. Base para las notificaciones.
   */
  async findMaintenanceDue(userId: string): Promise<MaintenanceDueItem[]> {
    const printers = await this.printerRepository.find({
      where: { createdBy: { id: userId }, isActive: true },
      relations: ['printLogs'],
    });

    const due: MaintenanceDueItem[] = [];
    for (const printer of printers) {
      const checks: {
        type: 'simple' | 'full';
        threshold: number;
        last: Date | null;
      }[] = [
        {
          type: 'simple',
          threshold: printer.maintenanceSimpleHours,
          last: printer.lastMaintenanceSimpleAt ?? null,
        },
        {
          type: 'full',
          threshold: printer.maintenanceFullHours,
          last: printer.lastMaintenanceFullAt ?? null,
        },
      ];

      for (const c of checks) {
        if (!c.threshold || c.threshold <= 0) continue;
        const hoursSince = this.printHoursSince(printer, c.last);
        if (hoursSince >= c.threshold) {
          due.push({
            printerId: printer.id,
            printerName: printer.name,
            type: c.type,
            hoursSince,
            threshold: c.threshold,
            lastMaintenanceAt: c.last,
          });
        }
      }
    }
    return due;
  }

  async update(
    id: string,
    updatePrinterDto: UpdatePrinterDto,
    user: User,
  ): Promise<Printer> {
    const printer = await this.findOne(id, user);
    Object.assign(printer, updatePrinterDto);
    return this.printerRepository.save(printer);
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const printer = await this.findOne(id, user);
    await this.printerRepository.remove(printer);
    return { message: `Printer ${printer.name} has been removed` };
  }

  async findAllByUser(userId: string): Promise<Printer[]> {
    return this.printerRepository.find({
      where: { createdBy: { id: userId } },
    });
  }
}
