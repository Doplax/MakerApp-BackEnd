import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './entities/store.entity.js';
import { CreateStoreDto } from './dto/create-store.dto.js';
import { UpdateStoreDto } from './dto/update-store.dto.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** Tiendas visibles para los usuarios (activas, en su orden). */
  findActive(): Promise<Store[]> {
    return this.storeRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /** Listado completo para el admin (incluye inactivas). */
  findAllAdmin(): Promise<Store[]> {
    return this.storeRepo.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Store> {
    const store = await this.storeRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException('Tienda no encontrada');
    return store;
  }

  async create(dto: CreateStoreDto): Promise<Store> {
    const saved = await this.storeRepo.save(this.storeRepo.create(dto));
    this.logger.log(`Tienda creada: ${saved.name}`);
    return saved;
  }

  async update(id: string, dto: UpdateStoreDto): Promise<Store> {
    const store = await this.findOne(id);
    const oldImageUrl = store.imageUrl;
    Object.assign(store, dto);
    const saved = await this.storeRepo.save(store);
    // Contrato de limpieza del volumen /uploads: al reemplazar el logo se
    // borra el viejo (deleteByUrl ignora URLs externas y estáticos del front).
    if (oldImageUrl && oldImageUrl !== saved.imageUrl) {
      await this.cloudinary.deleteByUrl(oldImageUrl);
    }
    return saved;
  }

  async remove(id: string): Promise<{ message: string }> {
    const store = await this.findOne(id);
    const imageUrl = store.imageUrl;
    await this.storeRepo.remove(store);
    if (imageUrl) await this.cloudinary.deleteByUrl(imageUrl);
    return { message: `Tienda "${store.name}" eliminada` };
  }
}
