import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogPurchaseOption } from './entities/catalog-purchase-option.entity.js';
import {
  CreatePurchaseOptionDto,
  UpdatePurchaseOptionDto,
} from './dto/create-purchase-option.dto.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';

/**
 * Opciones de compra por ítem del catálogo (comparador "Comprar en tienda").
 * Las cura el admin; los usuarios solo las leen para comparar y saltar a la
 * tienda. Mismo contrato de limpieza de /uploads que el resto de módulos con
 * imagen (logo del proveedor).
 */
@Injectable()
export class PurchaseOptionsService {
  constructor(
    @InjectRepository(CatalogPurchaseOption)
    private readonly optionRepo: Repository<CatalogPurchaseOption>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /**
   * Opciones visibles de un ítem para el comparador: activas, mejor precio
   * primero (los sin precio, al final) y sortOrder como desempate manual.
   */
  async findActiveForItem(catalogId: string): Promise<CatalogPurchaseOption[]> {
    const options = await this.optionRepo.find({
      where: { catalogId, isActive: true },
    });
    return options.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      const pa = a.price === null ? Number.POSITIVE_INFINITY : Number(a.price);
      const pb = b.price === null ? Number.POSITIVE_INFINITY : Number(b.price);
      return pa - pb;
    });
  }

  /** Todas las opciones de un ítem (admin, incluidas inactivas). */
  findAllForItemAdmin(catalogId: string): Promise<CatalogPurchaseOption[]> {
    return this.optionRepo.find({
      where: { catalogId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  private async findOne(id: string): Promise<CatalogPurchaseOption> {
    const option = await this.optionRepo.findOne({ where: { id } });
    if (!option) {
      throw new NotFoundException(`Opción de compra ${id} no encontrada`);
    }
    return option;
  }

  create(dto: CreatePurchaseOptionDto): Promise<CatalogPurchaseOption> {
    return this.optionRepo.save(this.optionRepo.create(dto as object));
  }

  async update(
    id: string,
    dto: UpdatePurchaseOptionDto,
  ): Promise<CatalogPurchaseOption> {
    const option = await this.findOne(id);
    const oldLogoUrl = option.vendorLogoUrl;
    Object.assign(option, dto);
    const saved = await this.optionRepo.save(option);
    // Contrato de limpieza de /uploads: al reemplazar el logo se borra el viejo
    // (deleteByUrl ignora URLs externas y estáticos del front).
    if (oldLogoUrl && oldLogoUrl !== saved.vendorLogoUrl) {
      await this.cloudinary.deleteByUrl(oldLogoUrl);
    }
    return saved;
  }

  async remove(id: string): Promise<{ message: string }> {
    const option = await this.findOne(id);
    const logoUrl = option.vendorLogoUrl;
    await this.optionRepo.remove(option);
    if (logoUrl) await this.cloudinary.deleteByUrl(logoUrl);
    return { message: `Opción de compra "${option.vendorName}" eliminada` };
  }
}
