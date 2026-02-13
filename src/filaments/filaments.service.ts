import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CreateFilamentDto } from './dto/create-filament.dto.js';
import { UpdateFilamentDto } from './dto/update-filament.dto.js';
import { FilterFilamentDto } from './dto/filter-filament.dto.js';
import { Filament } from './entities/filament.entity.js';
import { User } from '../users/entities/user.entity.js';
import { FilamentStatus } from '../common/enums/index.js';

@Injectable()
export class FilamentsService {
  private readonly logger = new Logger(FilamentsService.name);

  constructor(
    @InjectRepository(Filament)
    private readonly filamentRepository: Repository<Filament>,
  ) {}

  async create(
    createFilamentDto: CreateFilamentDto,
    user: User,
  ): Promise<Filament> {
    const filament = this.filamentRepository.create({
      ...createFilamentDto,
      remainingWeight:
        createFilamentDto.remainingWeight ?? createFilamentDto.totalWeight,
      createdBy: user,
    });

    const saved = await this.filamentRepository.save(filament);
    this.logger.log(
      `Filament created: ${saved.brand} ${saved.material} ${saved.color} by ${user.email}`,
    );
    return saved;
  }

  async findAll(filterDto: FilterFilamentDto, user: User) {
    const {
      page = 1,
      limit = 20,
      material,
      status,
      color,
      brand,
      search,
    } = filterDto;

    const qb: SelectQueryBuilder<Filament> = this.filamentRepository
      .createQueryBuilder('filament')
      .leftJoinAndSelect('filament.createdBy', 'user')
      .where('user.id = :userId', { userId: user.id });

    if (material) {
      qb.andWhere('filament.material = :material', { material });
    }

    if (status) {
      qb.andWhere('filament.status = :status', { status });
    }

    if (color) {
      qb.andWhere('LOWER(filament.color) LIKE LOWER(:color)', {
        color: `%${color}%`,
      });
    }

    if (brand) {
      qb.andWhere('LOWER(filament.brand) LIKE LOWER(:brand)', {
        brand: `%${brand}%`,
      });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(filament.brand) LIKE LOWER(:search) OR LOWER(filament.color) LIKE LOWER(:search) OR LOWER(filament.notes) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('filament.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: User): Promise<Filament> {
    const filament = await this.filamentRepository.findOne({
      where: { id, createdBy: { id: user.id } },
      relations: ['createdBy', 'printLogs'],
    });

    if (!filament) {
      throw new NotFoundException(`Filament with ID ${id} not found`);
    }

    return filament;
  }

  async update(
    id: string,
    updateFilamentDto: UpdateFilamentDto,
    user: User,
  ): Promise<Filament> {
    const filament = await this.findOne(id, user);
    Object.assign(filament, updateFilamentDto);

    // Auto-update status based on remaining weight
    if (updateFilamentDto.remainingWeight !== undefined) {
      filament.status = this.calculateStatus(filament);
    }

    return this.filamentRepository.save(filament);
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const filament = await this.findOne(id, user);
    await this.filamentRepository.remove(filament);
    return {
      message: `Filament ${filament.brand} ${filament.color} has been removed`,
    };
  }

  /**
   * Descuenta peso del filamento (usado por PrintLogs)
   */
  async deductWeight(id: string, weight: number): Promise<Filament> {
    const filament = await this.filamentRepository.findOne({ where: { id } });
    if (!filament) {
      throw new NotFoundException(`Filament with ID ${id} not found`);
    }

    filament.remainingWeight = Math.max(0, filament.remainingWeight - weight);
    filament.status = this.calculateStatus(filament);

    return this.filamentRepository.save(filament);
  }

  /**
   * Restaura peso del filamento (al eliminar un print log)
   */
  async restoreWeight(id: string, weight: number): Promise<Filament> {
    const filament = await this.filamentRepository.findOne({ where: { id } });
    if (!filament) {
      throw new NotFoundException(`Filament with ID ${id} not found`);
    }

    filament.remainingWeight = Math.min(
      filament.totalWeight,
      filament.remainingWeight + weight,
    );
    filament.status = this.calculateStatus(filament);

    return this.filamentRepository.save(filament);
  }

  private calculateStatus(filament: Filament): FilamentStatus {
    const percentage = (filament.remainingWeight / filament.totalWeight) * 100;
    if (percentage <= 0) return FilamentStatus.EMPTY;
    if (percentage <= 15) return FilamentStatus.LOW_STOCK;
    return filament.status === FilamentStatus.IN_USE
      ? FilamentStatus.IN_USE
      : FilamentStatus.AVAILABLE;
  }

  /**
   * Obtiene filamentos para estadísticas (sin filtro de usuario para admin)
   */
  async findAllByUser(userId: string): Promise<Filament[]> {
    return this.filamentRepository.find({
      where: { createdBy: { id: userId } },
      relations: ['printLogs'],
    });
  }
}
