import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilamentOffer } from './entities/filament-offer.entity.js';
import { CreateFilamentOfferDto } from './dto/create-filament-offer.dto.js';
import { UpdateFilamentOfferDto } from './dto/update-filament-offer.dto.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';

@Injectable()
export class FilamentOffersService {
  private readonly logger = new Logger(FilamentOffersService.name);

  constructor(
    @InjectRepository(FilamentOffer)
    private readonly offerRepo: Repository<FilamentOffer>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** Ofertas visibles para los usuarios (activas, en su orden). */
  findActive(): Promise<FilamentOffer[]> {
    return this.offerRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  /** Listado completo para el admin (incluye inactivas). */
  findAllAdmin(): Promise<FilamentOffer[]> {
    return this.offerRepo.find({
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<FilamentOffer> {
    const offer = await this.offerRepo.findOne({ where: { id } });
    if (!offer) throw new NotFoundException('Oferta no encontrada');
    return offer;
  }

  async create(dto: CreateFilamentOfferDto): Promise<FilamentOffer> {
    const saved = await this.offerRepo.save(this.offerRepo.create(dto));
    this.logger.log(`Oferta creada: ${saved.title}`);
    return saved;
  }

  async update(id: string, dto: UpdateFilamentOfferDto): Promise<FilamentOffer> {
    const offer = await this.findOne(id);
    const oldImageUrl = offer.imageUrl;
    Object.assign(offer, dto);
    const saved = await this.offerRepo.save(offer);
    // Contrato de limpieza del volumen /uploads: al reemplazar la imagen se
    // borra la vieja (deleteByUrl ignora URLs externas y estáticos del front).
    if (oldImageUrl && oldImageUrl !== saved.imageUrl) {
      await this.cloudinary.deleteByUrl(oldImageUrl);
    }
    return saved;
  }

  async remove(id: string): Promise<{ message: string }> {
    const offer = await this.findOne(id);
    const imageUrl = offer.imageUrl;
    await this.offerRepo.remove(offer);
    if (imageUrl) await this.cloudinary.deleteByUrl(imageUrl);
    return { message: `Oferta "${offer.title}" eliminada` };
  }
}
