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

    const [
      filamentAgg,
      materialRows,
      statusRows,
      colorRows,
      lowStockFilaments,
      printLogAgg,
      topFilamentRows,
      totalPrinters,
      totalProjects,
      recentPrintLogs,
    ] = await Promise.all([
      // Agregados de filamentos
      this.filamentRepository
        .createQueryBuilder('f')
        .select('COUNT(*)', 'totalSpools')
        .addSelect('COALESCE(SUM(f.remainingWeight), 0)', 'totalWeightAvailable')
        .addSelect('COALESCE(SUM(f.totalWeight), 0)', 'totalWeightOriginal')
        .addSelect('COALESCE(SUM(f.price), 0)', 'totalSpent')
        .where('f.createdBy = :userId', { userId })
        .getRawOne(),

      // Distribución por material
      this.filamentRepository
        .createQueryBuilder('f')
        .select('f.material', 'material')
        .addSelect('COUNT(*)', 'count')
        .where('f.createdBy = :userId', { userId })
        .groupBy('f.material')
        .getRawMany(),

      // Distribución por estado
      this.filamentRepository
        .createQueryBuilder('f')
        .select('f.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('f.createdBy = :userId', { userId })
        .groupBy('f.status')
        .getRawMany(),

      // Distribución por color
      this.filamentRepository
        .createQueryBuilder('f')
        .select('f.color', 'color')
        .addSelect('MIN(f.colorHex)', 'colorHex')
        .addSelect('COUNT(*)', 'count')
        .where('f.createdBy = :userId', { userId })
        .groupBy('f.color')
        .getRawMany(),

      // Filamentos con stock bajo/vacío
      this.filamentRepository.find({
        where: [
          { createdBy: { id: userId }, status: FilamentStatus.LOW_STOCK },
          { createdBy: { id: userId }, status: FilamentStatus.EMPTY },
        ],
        select: ['id', 'brand', 'color', 'colorHex', 'material', 'remainingWeight', 'totalWeight', 'status'],
      }),

      // Agregados de logs de impresión
      this.printLogRepository
        .createQueryBuilder('pl')
        .select('COUNT(*)', 'totalPrints')
        .addSelect('COALESCE(SUM(pl.weightUsed), 0)', 'totalWeightUsed')
        .addSelect('COALESCE(SUM(pl.printDuration), 0)', 'totalPrintTime')
        .where('pl.createdBy = :userId', { userId })
        .getRawOne(),

      // Top 5 filamentos por peso consumido
      this.printLogRepository
        .createQueryBuilder('pl')
        .select('pl.filamentId', 'filamentId')
        .addSelect('SUM(pl.weightUsed)', 'totalUsed')
        .where('pl.createdBy = :userId', { userId })
        .andWhere('pl.filamentId IS NOT NULL')
        .groupBy('pl.filamentId')
        .orderBy('SUM(pl.weightUsed)', 'DESC')
        .limit(5)
        .getRawMany(),

      // Contadores de impresoras y proyectos
      this.printerRepository.count({ where: { createdBy: { id: userId } } }),
      this.projectRepository.count({ where: { createdBy: { id: userId } } }),

      // Últimas 5 impresiones con relaciones
      this.printLogRepository.find({
        where: { createdBy: { id: userId } },
        relations: ['filament', 'printer', 'project'],
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    // Resolver entidades de filamentos para topFilaments
    const topFilamentIds: string[] = topFilamentRows.map((r: any) => r.filamentId);
    const topFilamentEntities = topFilamentIds.length
      ? await this.filamentRepository.findByIds(topFilamentIds)
      : [];

    const topFilaments = topFilamentRows.map((r: any) => ({
      filament: topFilamentEntities.find((f) => f.id === r.filamentId),
      totalUsed: parseFloat(r.totalUsed),
    }));

    // Construir distribuciones
    const materialDistribution: Record<string, number> = {};
    materialRows.forEach((r: any) => { materialDistribution[r.material] = parseInt(r.count); });

    const statusDistribution: Record<string, number> = {};
    statusRows.forEach((r: any) => { statusDistribution[r.status] = parseInt(r.count); });

    const colorDistribution: Record<string, { count: number; hex: string | null }> = {};
    colorRows.forEach((r: any) => { colorDistribution[r.color] = { count: parseInt(r.count), hex: r.colorHex }; });

    return {
      overview: {
        totalSpools:           parseInt(filamentAgg.totalSpools),
        totalWeightAvailable:  Math.round(parseFloat(filamentAgg.totalWeightAvailable)),
        totalWeightOriginal:   Math.round(parseFloat(filamentAgg.totalWeightOriginal)),
        totalWeightUsed:       Math.round(parseFloat(printLogAgg.totalWeightUsed)),
        totalSpent:            Math.round(parseFloat(filamentAgg.totalSpent) * 100) / 100,
        totalPrints:           parseInt(printLogAgg.totalPrints),
        totalPrintTime:        Math.round(parseFloat(printLogAgg.totalPrintTime)),
        totalPrinters,
        totalProjects,
      },
      alerts: {
        lowStockCount:     lowStockFilaments.length,
        lowStockFilaments: lowStockFilaments.map((f) => ({
          id:              f.id,
          brand:           f.brand,
          color:           f.color,
          colorHex:        f.colorHex,
          material:        f.material,
          remainingWeight: f.remainingWeight,
          totalWeight:     f.totalWeight,
          status:          f.status,
        })),
      },
      distributions: {
        byMaterial: materialDistribution,
        byStatus:   statusDistribution,
        byColor:    colorDistribution,
      },
      recentActivity: recentPrintLogs,
      topFilaments,
    };
  }
}
