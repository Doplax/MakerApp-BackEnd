import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Filament } from '../filaments/entities/filament.entity.js';
import { PrintLog } from '../print-logs/entities/print-log.entity.js';
import { Printer } from '../printers/entities/printer.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { User } from '../users/entities/user.entity.js';
import { FilamentStatus } from '../common/enums/index.js';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Filament)
    private readonly filamentRepository: Repository<Filament>,
    @InjectRepository(PrintLog)
    private readonly printLogRepository: Repository<PrintLog>,
    @InjectRepository(Printer)
    private readonly printerRepository: Repository<Printer>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async getDashboardStats(user: User) {
    const userId = user.id;

    // Estadísticas de filamentos
    const filaments = await this.filamentRepository.find({
      where: { createdBy: { id: userId } },
    });

    const totalSpools = filaments.length;
    const totalWeightAvailable = filaments.reduce(
      (sum, f) => sum + f.remainingWeight,
      0,
    );
    const totalWeightOriginal = filaments.reduce(
      (sum, f) => sum + f.totalWeight,
      0,
    );
    const totalSpent = filaments.reduce(
      (sum, f) => sum + (Number(f.price) || 0),
      0,
    );
    const lowStockFilaments = filaments.filter(
      (f) =>
        f.status === FilamentStatus.LOW_STOCK ||
        f.status === FilamentStatus.EMPTY,
    );

    // Distribución por material
    const materialDistribution: Record<string, number> = {};
    filaments.forEach((f) => {
      materialDistribution[f.material] =
        (materialDistribution[f.material] || 0) + 1;
    });

    // Distribución por estado
    const statusDistribution: Record<string, number> = {};
    filaments.forEach((f) => {
      statusDistribution[f.status] = (statusDistribution[f.status] || 0) + 1;
    });

    // Distribución por color
    const colorDistribution: Record<
      string,
      { count: number; hex: string | null }
    > = {};
    filaments.forEach((f) => {
      if (!colorDistribution[f.color]) {
        colorDistribution[f.color] = { count: 0, hex: f.colorHex };
      }
      colorDistribution[f.color].count++;
    });

    // Print logs
    const printLogs = await this.printLogRepository.find({
      where: { createdBy: { id: userId } },
    });

    const totalPrints = printLogs.length;
    const totalWeightUsed = printLogs.reduce((sum, l) => sum + l.weightUsed, 0);
    const totalPrintTime = printLogs.reduce(
      (sum, l) => sum + (l.printDuration || 0),
      0,
    );

    // Contadores adicionales
    const totalPrinters = await this.printerRepository.count({
      where: { createdBy: { id: userId } },
    });
    const totalProjects = await this.projectRepository.count({
      where: { createdBy: { id: userId } },
    });

    // Últimas impresiones
    const recentPrintLogs = await this.printLogRepository.find({
      where: { createdBy: { id: userId } },
      relations: ['filament', 'printer', 'project'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    // Top filamentos más usados (por peso consumido)
    const filamentUsage: Record<
      string,
      { filament: Filament; totalUsed: number }
    > = {};
    printLogs.forEach((log) => {
      const fId = log.filament?.id;
      if (fId) {
        if (!filamentUsage[fId]) {
          filamentUsage[fId] = { filament: log.filament, totalUsed: 0 };
        }
        filamentUsage[fId].totalUsed += log.weightUsed;
      }
    });

    const topFilaments = Object.values(filamentUsage)
      .sort((a, b) => b.totalUsed - a.totalUsed)
      .slice(0, 5);

    return {
      overview: {
        totalSpools,
        totalWeightAvailable: Math.round(totalWeightAvailable),
        totalWeightOriginal: Math.round(totalWeightOriginal),
        totalWeightUsed: Math.round(totalWeightUsed),
        totalSpent: Math.round(totalSpent * 100) / 100,
        totalPrints,
        totalPrintTime: Math.round(totalPrintTime),
        totalPrinters,
        totalProjects,
      },
      alerts: {
        lowStockCount: lowStockFilaments.length,
        lowStockFilaments: lowStockFilaments.map((f) => ({
          id: f.id,
          brand: f.brand,
          color: f.color,
          colorHex: f.colorHex,
          material: f.material,
          remainingWeight: f.remainingWeight,
          totalWeight: f.totalWeight,
          status: f.status,
        })),
      },
      distributions: {
        byMaterial: materialDistribution,
        byStatus: statusDistribution,
        byColor: colorDistribution,
      },
      recentActivity: recentPrintLogs,
      topFilaments,
    };
  }
}
