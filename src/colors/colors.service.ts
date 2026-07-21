import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Color } from './entities/color.entity.js';
import { CreateColorDto } from './dto/create-color.dto.js';
import { UpdateColorDto } from './dto/update-color.dto.js';
import { DEFAULT_COLORS } from './default-colors.js';

@Injectable()
export class ColorsService implements OnModuleInit {
  private readonly logger = new Logger(ColorsService.name);

  constructor(
    @InjectRepository(Color)
    private readonly colorRepo: Repository<Color>,
  ) {}

  /**
   * Al arrancar, siembra el set base de colores si faltan (idempotente por
   * nombre, case-insensitive). Aditivo: NO borra ni pisa los existentes ni los
   * que haya creado el admin. Corre tanto en dev (synchronize) como en prod
   * (tras las migraciones), así la tabla nunca queda vacía.
   */
  async onModuleInit(): Promise<void> {
    try {
      const existing = await this.colorRepo.find();
      const known = new Set(existing.map((c) => c.name.trim().toLowerCase()));
      const missing = DEFAULT_COLORS.filter(
        (c) => !known.has(c.name.trim().toLowerCase()),
      );
      if (missing.length === 0) return;
      const rows = missing.map((c, i) =>
        this.colorRepo.create({
          name: c.name,
          swatch: c.swatch,
          isActive: true,
          // Preserva el orden de DEFAULT_COLORS a continuación de los ya guardados.
          sortOrder: existing.length + i,
        }),
      );
      await this.colorRepo.save(rows);
      this.logger.log(`Sembrados ${rows.length} colores base`);
    } catch (err) {
      // No debe tumbar el arranque si la BD aún no está lista o la tabla no existe.
      this.logger.warn(`No se pudieron sembrar los colores base: ${String(err)}`);
    }
  }

  /** Colores visibles en los selectores (activos, en su orden). */
  findActive(): Promise<Color[]> {
    return this.colorRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /** Listado completo para el admin (incluye inactivos). */
  findAllAdmin(): Promise<Color[]> {
    return this.colorRepo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async findOne(id: string): Promise<Color> {
    const color = await this.colorRepo.findOne({ where: { id } });
    if (!color) throw new NotFoundException('Color no encontrado');
    return color;
  }

  async create(dto: CreateColorDto): Promise<Color> {
    await this.assertNameFree(dto.name);
    const saved = await this.colorRepo.save(this.colorRepo.create(dto));
    this.logger.log(`Color creado: ${saved.name}`);
    return saved;
  }

  async update(id: string, dto: UpdateColorDto): Promise<Color> {
    const color = await this.findOne(id);
    if (dto.name && dto.name.trim().toLowerCase() !== color.name.trim().toLowerCase()) {
      await this.assertNameFree(dto.name);
    }
    Object.assign(color, dto);
    return this.colorRepo.save(color);
  }

  async remove(id: string): Promise<{ message: string }> {
    const color = await this.findOne(id);
    await this.colorRepo.remove(color);
    return { message: `Color "${color.name}" eliminado` };
  }

  /** Evita nombres duplicados (case-insensitive). */
  private async assertNameFree(name: string): Promise<void> {
    const clash = await this.colorRepo
      .createQueryBuilder('c')
      .where('LOWER(c.name) = LOWER(:name)', { name: name.trim() })
      .getOne();
    if (clash) throw new ConflictException(`Ya existe el color "${name}"`);
  }
}
