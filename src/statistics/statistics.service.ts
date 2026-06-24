import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Not, IsNull, Repository } from 'typeorm';
import { Filament } from '../filaments/entities/filament.entity.js';
import { PrintLog } from '../print-logs/entities/print-log.entity.js';
import { Printer } from '../printers/entities/printer.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { User } from '../users/entities/user.entity.js';
import { FilamentCatalog } from '../filament-catalog/entities/filament-catalog.entity.js';
import { FilamentStatus, PrintStatus } from '../common/enums/index.js';

export interface AdminOverview {
  users: {
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
    newLast30Days: number;
    onMap: number;
  };
  catalog: {
    total: number;
    active: number;
    inactive: number;
  };
}

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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FilamentCatalog)
    private readonly catalogRepository: Repository<FilamentCatalog>,
  ) {}

  /**
   * Métricas agregadas de toda la plataforma para el panel de administración.
   * Solo lecturas (COUNT / GROUP BY); no modifica datos.
   */
  async getAdminOverview(): Promise<AdminOverview> {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [
      totalUsers,
      activeUsers,
      newUsers,
      usersOnMap,
      roleRows,
      totalCatalog,
      activeCatalog,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.userRepository.count({
        where: { createdAt: MoreThanOrEqual(since) },
      }),
      this.userRepository.count({
        where: { latitude: Not(IsNull()), longitude: Not(IsNull()) },
      }),
      this.userRepository
        .createQueryBuilder('u')
        .select('u.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .groupBy('u.role')
        .getRawMany<{ role: string; count: string }>(),
      this.catalogRepository.count(),
      this.catalogRepository.count({ where: { isActive: true } }),
    ]);

    const byRole: Record<string, number> = {};
    roleRows.forEach((r) => {
      byRole[r.role] = parseInt(r.count, 10);
    });

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        byRole,
        newLast30Days: newUsers,
        onMap: usersOnMap,
      },
      catalog: {
        total: totalCatalog,
        active: activeCatalog,
        inactive: totalCatalog - activeCatalog,
      },
    };
  }

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
      salesAgg,
    ] = await Promise.all([
      // Agregados de filamentos
      this.filamentRepository
        .createQueryBuilder('f')
        .select('COUNT(*)', 'totalSpools')
        .addSelect(
          'COALESCE(SUM(f.remainingWeight), 0)',
          'totalWeightAvailable',
        )
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
        select: [
          'id',
          'brand',
          'color',
          'colorHex',
          'material',
          'remainingWeight',
          'totalWeight',
          'status',
        ],
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

      // Ganancias / ventas: suma de price de proyectos vendidos (kanban done)
      this.projectRepository
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.price), 0)', 'totalSales')
        .where('p.createdBy = :userId', { userId })
        .andWhere('p.kanbanStatus = :status', { status: 'done' })
        .getRawOne(),
    ]);

    // Resolver entidades de filamentos para topFilaments
    const topFilamentIds: string[] = topFilamentRows.map(
      (r: any) => r.filamentId,
    );
    const topFilamentEntities = topFilamentIds.length
      ? await this.filamentRepository.findByIds(topFilamentIds)
      : [];

    const topFilaments = topFilamentRows
      .map((r: any) => ({
        filament: topFilamentEntities.find((f) => f.id === r.filamentId),
        totalUsed: parseFloat(r.totalUsed),
      }))
      .filter((entry) => entry.filament !== undefined);

    // Construir distribuciones
    const materialDistribution: Record<string, number> = {};
    materialRows.forEach((r: any) => {
      materialDistribution[r.material] = parseInt(r.count);
    });

    const statusDistribution: Record<string, number> = {};
    statusRows.forEach((r: any) => {
      statusDistribution[r.status] = parseInt(r.count);
    });

    const colorDistribution: Record<
      string,
      { count: number; hex: string | null }
    > = {};
    colorRows.forEach((r: any) => {
      colorDistribution[r.color] = {
        count: parseInt(r.count),
        hex: r.colorHex,
      };
    });

    return {
      overview: {
        totalSpools: parseInt(filamentAgg.totalSpools),
        totalWeightAvailable: Math.round(
          parseFloat(filamentAgg.totalWeightAvailable),
        ),
        totalWeightOriginal: Math.round(
          parseFloat(filamentAgg.totalWeightOriginal),
        ),
        totalWeightUsed: Math.round(parseFloat(printLogAgg.totalWeightUsed)),
        totalSpent: Math.round(parseFloat(filamentAgg.totalSpent) * 100) / 100,
        totalPrints: parseInt(printLogAgg.totalPrints),
        totalPrintTime: Math.round(parseFloat(printLogAgg.totalPrintTime)),
        totalPrinters,
        totalProjects,
        totalSales: Math.round(parseFloat(salesAgg.totalSales) * 100) / 100,
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

  /**
   * Estadística mensual del maker: proyectos completados y horas de impresión
   * en los últimos 30 días. Usado en el perfil privado.
   */
  async getMonthlyActivity(
    user: User,
  ): Promise<{ projectsDone: number; printHours: number }> {
    const userId = user.id;
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [projectsDone, printAgg] = await Promise.all([
      this.projectRepository.count({
        where: {
          createdBy: { id: userId },
          kanbanStatus: 'done',
          updatedAt: MoreThanOrEqual(since),
        },
      }),
      this.printLogRepository
        .createQueryBuilder('pl')
        .select('COALESCE(SUM(pl.printDuration), 0)', 'minutes')
        .where('pl.createdBy = :userId', { userId })
        .andWhere('pl.status = :status', { status: PrintStatus.COMPLETED })
        .andWhere('pl.updatedAt >= :since', { since })
        .getRawOne<{ minutes: string }>(),
    ]);

    const totalMinutes = printAgg?.minutes ? parseFloat(printAgg.minutes) : 0;
    return {
      projectsDone,
      printHours: Math.round((totalMinutes / 60) * 10) / 10,
    };
  }
}
