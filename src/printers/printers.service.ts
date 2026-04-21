import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePrinterDto } from './dto/create-printer.dto.js';
import { UpdatePrinterDto } from './dto/update-printer.dto.js';
import { Printer } from './entities/printer.entity.js';
import { User } from '../users/entities/user.entity.js';

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

  async findAll(
    user: User,
  ): Promise<(Printer & { totalPrintHours: number })[]> {
    const printers = await this.printerRepository.find({
      where: { createdBy: { id: user.id } },
      relations: ['printLogs'],
      order: { createdAt: 'DESC' },
    });
    return printers.map((p) => this.withTotalHours(p));
  }

  async findOne(
    id: string,
    user: User,
  ): Promise<Printer & { totalPrintHours: number }> {
    const printer = await this.printerRepository.findOne({
      where: { id, createdBy: { id: user.id } },
      relations: ['printLogs'],
    });
    if (!printer) {
      throw new NotFoundException(`Printer with ID ${id} not found`);
    }
    return this.withTotalHours(printer);
  }

  private withTotalHours(
    printer: Printer,
  ): Printer & { totalPrintHours: number } {
    const minutes = (printer.printLogs ?? [])
      .filter((l) => l.printDuration)
      .reduce((sum, l) => sum + l.printDuration, 0);
    return Object.assign(printer, {
      totalPrintHours: Math.round(minutes / 60),
    });
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
