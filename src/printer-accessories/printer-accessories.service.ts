import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrinterAccessory } from './entities/printer-accessory.entity.js';
import { CreatePrinterAccessoryDto } from './dto/create-printer-accessory.dto.js';
import { UpdatePrinterAccessoryDto } from './dto/update-printer-accessory.dto.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';

@Injectable()
export class PrinterAccessoriesService {
  private readonly logger = new Logger(PrinterAccessoriesService.name);

  constructor(
    @InjectRepository(PrinterAccessory)
    private readonly repo: Repository<PrinterAccessory>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /**
   * Accesorios/recambios activos para una marca (los que se muestran en la ficha
   * de la impresora). Si no se pasa marca, devuelve TODOS los activos (fallback).
   */
  findActive(brand?: string, kind?: string): Promise<PrinterAccessory[]> {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.isActive = :active', { active: true });
    // Empareja por marca sin distinguir mayúsculas (o los "sin marca" = universales).
    if (brand?.trim()) {
      qb.andWhere('(a.brand IS NULL OR LOWER(a.brand) = LOWER(:brand))', {
        brand: brand.trim(),
      });
    }
    if (kind === 'accessory' || kind === 'spare') {
      qb.andWhere('a.kind = :kind', { kind });
    }
    return qb
      .orderBy('a.sortOrder', 'ASC')
      .addOrderBy('a.createdAt', 'DESC')
      .getMany();
  }

  findAllAdmin(): Promise<PrinterAccessory[]> {
    return this.repo.find({ order: { sortOrder: 'ASC', createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<PrinterAccessory> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Accesorio no encontrado');
    return item;
  }

  async create(dto: CreatePrinterAccessoryDto): Promise<PrinterAccessory> {
    const saved = await this.repo.save(this.repo.create(dto));
    this.logger.log(`Accesorio/recambio creado: ${saved.name} (${saved.kind})`);
    return saved;
  }

  async update(
    id: string,
    dto: UpdatePrinterAccessoryDto,
  ): Promise<PrinterAccessory> {
    const item = await this.findOne(id);
    const oldImageUrl = item.imageUrl;
    Object.assign(item, dto);
    const saved = await this.repo.save(item);
    // Contrato de limpieza del volumen /uploads: borra la imagen vieja si cambió.
    if (oldImageUrl && oldImageUrl !== saved.imageUrl) {
      await this.cloudinary.deleteByUrl(oldImageUrl);
    }
    return saved;
  }

  async remove(id: string): Promise<{ message: string }> {
    const item = await this.findOne(id);
    const imageUrl = item.imageUrl;
    await this.repo.remove(item);
    if (imageUrl) await this.cloudinary.deleteByUrl(imageUrl);
    return { message: `"${item.name}" eliminado` };
  }
}
