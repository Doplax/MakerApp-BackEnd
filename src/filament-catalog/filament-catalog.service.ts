import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { FilamentCatalog } from './entities/filament-catalog.entity.js';
import { CreateFilamentCatalogDto } from './dto/create-filament-catalog.dto.js';
import { UpdateFilamentCatalogDto } from './dto/update-filament-catalog.dto.js';
import { FilterFilamentCatalogDto } from './dto/filter-filament-catalog.dto.js';

@Injectable()
export class FilamentCatalogService {
  private readonly logger = new Logger(FilamentCatalogService.name);

  constructor(
    @InjectRepository(FilamentCatalog)
    private readonly catalogRepository: Repository<FilamentCatalog>,
  ) {}

  async create(dto: CreateFilamentCatalogDto): Promise<FilamentCatalog> {
    const catalog = this.catalogRepository.create(dto);
    const saved = await this.catalogRepository.save(catalog);
    this.logger.log(
      `Catalog entry created: ${saved.brand} ${saved.material} ${saved.color}`,
    );
    return saved;
  }

  async findAll(filterDto: FilterFilamentCatalogDto) {
    const {
      page = 1,
      limit = 50,
      material,
      color,
      brand,
      search,
    } = filterDto;

    const qb: SelectQueryBuilder<FilamentCatalog> = this.catalogRepository
      .createQueryBuilder('catalog')
      .where('catalog.isActive = :isActive', { isActive: true });

    if (material) {
      qb.andWhere('catalog.material = :material', { material });
    }

    if (color) {
      qb.andWhere('LOWER(catalog.color) LIKE LOWER(:color)', {
        color: `%${color}%`,
      });
    }

    if (brand) {
      qb.andWhere('LOWER(catalog.brand) LIKE LOWER(:brand)', {
        brand: `%${brand}%`,
      });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(catalog.brand) LIKE LOWER(:search) OR LOWER(catalog.color) LIKE LOWER(:search) OR LOWER(catalog.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('catalog.brand', 'ASC')
      .addOrderBy('catalog.material', 'ASC')
      .addOrderBy('catalog.color', 'ASC')
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

  async findAllAdmin(filterDto: FilterFilamentCatalogDto) {
    const {
      page = 1,
      limit = 50,
      material,
      color,
      brand,
      search,
    } = filterDto;

    const qb: SelectQueryBuilder<FilamentCatalog> = this.catalogRepository
      .createQueryBuilder('catalog');

    if (material) {
      qb.andWhere('catalog.material = :material', { material });
    }

    if (color) {
      qb.andWhere('LOWER(catalog.color) LIKE LOWER(:color)', {
        color: `%${color}%`,
      });
    }

    if (brand) {
      qb.andWhere('LOWER(catalog.brand) LIKE LOWER(:brand)', {
        brand: `%${brand}%`,
      });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(catalog.brand) LIKE LOWER(:search) OR LOWER(catalog.color) LIKE LOWER(:search) OR LOWER(catalog.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('catalog.brand', 'ASC')
      .addOrderBy('catalog.material', 'ASC')
      .addOrderBy('catalog.color', 'ASC')
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

  async findOne(id: string): Promise<FilamentCatalog> {
    const catalog = await this.catalogRepository.findOne({ where: { id } });
    if (!catalog) {
      throw new NotFoundException(`Catalog entry with ID ${id} not found`);
    }
    return catalog;
  }

  async update(
    id: string,
    dto: UpdateFilamentCatalogDto,
  ): Promise<FilamentCatalog> {
    const catalog = await this.findOne(id);
    Object.assign(catalog, dto);
    return this.catalogRepository.save(catalog);
  }

  async bulkUpsert(
    items: CreateFilamentCatalogDto[],
  ): Promise<{ created: number; updated: number; total: number }> {
    let created = 0;
    let updated = 0;

    for (const dto of items) {
      const existing = await this.catalogRepository.findOne({
        where: {
          brand: dto.brand,
          material: dto.material,
          color: dto.color,
        },
      });

      if (existing) {
        Object.assign(existing, dto);
        await this.catalogRepository.save(existing);
        updated++;
      } else {
        const entity = this.catalogRepository.create(dto);
        await this.catalogRepository.save(entity);
        created++;
      }
    }

    this.logger.log(`Bulk upsert: ${created} created, ${updated} updated`);
    return { created, updated, total: items.length };
  }

  async remove(id: string): Promise<{ message: string }> {
    const catalog = await this.findOne(id);
    await this.catalogRepository.remove(catalog);
    return {
      message: `Catalog entry ${catalog.brand} ${catalog.color} has been removed`,
    };
  }
}
