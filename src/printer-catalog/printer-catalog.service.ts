import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PrinterCatalog } from './entities/printer-catalog.entity.js';
import { CreatePrinterCatalogDto } from './dto/create-printer-catalog.dto.js';
import { UpdatePrinterCatalogDto } from './dto/update-printer-catalog.dto.js';
import { FilterPrinterCatalogDto } from './dto/filter-printer-catalog.dto.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';

@Injectable()
export class PrinterCatalogService {
  private readonly logger = new Logger(PrinterCatalogService.name);

  constructor(
    @InjectRepository(PrinterCatalog)
    private readonly catalogRepository: Repository<PrinterCatalog>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(dto: CreatePrinterCatalogDto): Promise<PrinterCatalog> {
    const catalog = this.catalogRepository.create(dto);
    const saved = await this.catalogRepository.save(catalog);
    this.logger.log(`Catalog entry created: ${saved.brand} ${saved.model}`);
    return saved;
  }

  async findAll(filterDto: FilterPrinterCatalogDto) {
    const qb = this.buildFilteredQuery(filterDto).andWhere(
      'catalog.isActive = :isActive',
      { isActive: true },
    );
    return this.paginate(qb, filterDto);
  }

  async findAllAdmin(filterDto: FilterPrinterCatalogDto) {
    return this.paginate(this.buildFilteredQuery(filterDto), filterDto);
  }

  async findOne(id: string): Promise<PrinterCatalog> {
    const catalog = await this.catalogRepository.findOne({ where: { id } });
    if (!catalog) {
      throw new NotFoundException(`Catalog entry with ID ${id} not found`);
    }
    return catalog;
  }

  async update(
    id: string,
    dto: UpdatePrinterCatalogDto,
  ): Promise<PrinterCatalog> {
    const catalog = await this.findOne(id);
    const oldImageUrl = catalog.imageUrl;
    Object.assign(catalog, dto);
    const saved = await this.catalogRepository.save(catalog);
    if (oldImageUrl && oldImageUrl !== saved.imageUrl) {
      await this.cloudinary.deleteByUrl(oldImageUrl);
    }
    return saved;
  }

  async bulkUpsert(
    items: CreatePrinterCatalogDto[],
  ): Promise<{ created: number; updated: number; total: number }> {
    let created = 0;
    let updated = 0;

    for (const dto of items) {
      const existing = await this.catalogRepository.findOne({
        where: { brand: dto.brand, model: dto.model },
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
    const imageUrl = catalog.imageUrl;
    await this.catalogRepository.remove(catalog);
    if (imageUrl) await this.cloudinary.deleteByUrl(imageUrl);
    return {
      message: `Catalog entry ${catalog.brand} ${catalog.model} has been removed`,
    };
  }

  private buildFilteredQuery(
    filterDto: FilterPrinterCatalogDto,
  ): SelectQueryBuilder<PrinterCatalog> {
    const { type, brand, model, search } = filterDto;

    const qb = this.catalogRepository.createQueryBuilder('catalog');

    if (type) {
      qb.andWhere('catalog.type = :type', { type });
    }

    if (brand) {
      qb.andWhere('LOWER(catalog.brand) LIKE LOWER(:brand)', {
        brand: `%${brand}%`,
      });
    }

    if (model) {
      qb.andWhere('LOWER(catalog.model) LIKE LOWER(:model)', {
        model: `%${model}%`,
      });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(catalog.brand) LIKE LOWER(:search) OR LOWER(catalog.model) LIKE LOWER(:search) OR LOWER(catalog.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    return qb;
  }

  private async paginate(
    qb: SelectQueryBuilder<PrinterCatalog>,
    filterDto: FilterPrinterCatalogDto,
  ) {
    const { page = 1, limit = 50 } = filterDto;

    qb.orderBy('catalog.brand', 'ASC')
      .addOrderBy('catalog.model', 'ASC')
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
}
