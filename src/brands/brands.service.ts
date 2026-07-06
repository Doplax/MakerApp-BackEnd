import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Brand } from './entities/brand.entity.js';
import { CreateBrandDto } from './dto/create-brand.dto.js';
import { UpdateBrandDto } from './dto/update-brand.dto.js';
import { normalizeBrand } from './brand-normalize.js';
import { Filament } from '../filaments/entities/filament.entity.js';
import { FilamentCatalog } from '../filament-catalog/entities/filament-catalog.entity.js';
import { Printer } from '../printers/entities/printer.entity.js';
import { PrinterCatalog } from '../printer-catalog/entities/printer-catalog.entity.js';

/** Tablas cuyo `brandId` apunta a una marca (para conteo, productos y fusión). */
const BRAND_TABLES = ['filaments', 'filament_catalog', 'printers', 'printer_catalog'] as const;

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(Filament)
    private readonly filamentRepo: Repository<Filament>,
    @InjectRepository(FilamentCatalog)
    private readonly filamentCatalogRepo: Repository<FilamentCatalog>,
    @InjectRepository(Printer)
    private readonly printerRepo: Repository<Printer>,
    @InjectRepository(PrinterCatalog)
    private readonly printerCatalogRepo: Repository<PrinterCatalog>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Devuelve el id de la marca de un texto libre, CREÁNDOLA si no existe. La usan
   * los flujos de escritura (alta de filamento/impresora, catálogos, imports) para
   * mantener `brandId` poblado sin obligar al usuario a elegir de una lista.
   * Reconcilia por `slug` (normalizado) y por `aliases`.
   */
  async resolveIdForName(name?: string | null): Promise<string | null> {
    const slug = normalizeBrand(name);
    if (!slug) return null;

    const existing = await this.findBySlugOrAlias(slug);
    if (existing) return existing.id;

    // Crear. Ante carrera (dos altas simultáneas de la misma marca), el índice
    // único de slug hace fallar el segundo save → reintentamos leyendo.
    try {
      const created = await this.brandRepo.save(
        this.brandRepo.create({ name: (name ?? '').trim(), slug, aliases: [] }),
      );
      return created.id;
    } catch {
      const again = await this.findBySlugOrAlias(slug);
      return again?.id ?? null;
    }
  }

  private async findBySlugOrAlias(slug: string): Promise<Brand | null> {
    const bySlug = await this.brandRepo.findOne({ where: { slug } });
    if (bySlug) return bySlug;
    // Alias: comparación por slug normalizado de cada alias (jsonb → en memoria).
    const all = await this.brandRepo.find();
    return (
      all.find((b) => (b.aliases ?? []).some((a) => normalizeBrand(a) === slug)) ??
      null
    );
  }

  /** Listado para pickers/filtros (logueados). Opcionalmente por ámbito. */
  async findAll(scope?: string): Promise<Brand[]> {
    const qb = this.brandRepo
      .createQueryBuilder('b')
      .where('b.isActive = :active', { active: true })
      .orderBy('b.name', 'ASC');
    if (scope === 'filament' || scope === 'printer') {
      qb.andWhere('b.scope IN (:...scopes)', { scopes: [scope, 'both'] });
    }
    return qb.getMany();
  }

  /** Listado admin con el nº de productos asociados por marca. */
  async findAllAdmin(): Promise<
    Array<Brand & { counts: Record<string, number> }>
  > {
    const brands = await this.brandRepo.find({ order: { name: 'ASC' } });
    const counts = await this.countsByBrand();
    return brands.map((b) => ({
      ...b,
      counts: counts.get(b.id) ?? this.emptyCounts(),
    }));
  }

  /** Marca + sus productos asociados (para "ver productos de la marca"). */
  async findProducts(id: string) {
    const brand = await this.findOne(id);
    const [filaments, filamentCatalog, printers, printerCatalog] =
      await Promise.all([
        this.filamentRepo.find({ where: { brandId: id }, order: { color: 'ASC' } }),
        this.filamentCatalogRepo.find({ where: { brandId: id }, order: { color: 'ASC' } }),
        this.printerRepo.find({ where: { brandId: id }, order: { model: 'ASC' } }),
        this.printerCatalogRepo.find({ where: { brandId: id }, order: { model: 'ASC' } }),
      ]);
    return { brand, filaments, filamentCatalog, printers, printerCatalog };
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException('Marca no encontrada');
    return brand;
  }

  async create(dto: CreateBrandDto): Promise<Brand> {
    const slug = normalizeBrand(dto.name);
    if (!slug) throw new BadRequestException('Nombre de marca inválido');
    const clash = await this.findBySlugOrAlias(slug);
    if (clash) {
      throw new BadRequestException(
        `Ya existe una marca equivalente: "${clash.name}"`,
      );
    }
    return this.brandRepo.save(
      this.brandRepo.create({
        name: dto.name.trim(),
        slug,
        scope: dto.scope ?? 'both',
        aliases: dto.aliases ?? [],
        logoUrl: dto.logoUrl ?? null,
        website: dto.website ?? null,
      }),
    );
  }

  async update(id: string, dto: UpdateBrandDto): Promise<Brand> {
    const brand = await this.findOne(id);
    if (dto.name && normalizeBrand(dto.name) !== brand.slug) {
      const newSlug = normalizeBrand(dto.name);
      if (!newSlug) throw new BadRequestException('Nombre de marca inválido');
      const clash = await this.findBySlugOrAlias(newSlug);
      if (clash && clash.id !== id) {
        throw new BadRequestException(
          `Ya existe una marca equivalente: "${clash.name}"`,
        );
      }
      brand.slug = newSlug;
      brand.name = dto.name.trim();
    } else if (dto.name) {
      brand.name = dto.name.trim();
    }
    if (dto.scope !== undefined) brand.scope = dto.scope;
    if (dto.aliases !== undefined) brand.aliases = dto.aliases;
    if (dto.logoUrl !== undefined) brand.logoUrl = dto.logoUrl;
    if (dto.website !== undefined) brand.website = dto.website;
    if (dto.isActive !== undefined) brand.isActive = dto.isActive;
    return this.brandRepo.save(brand);
  }

  /**
   * Fusiona `sourceId` en `targetId`: mueve todos los productos (brandId) a la
   * marca destino, añade el nombre/alias de la origen como alias de la destino y
   * borra la origen. Transaccional. Para limpiar los duplicados del texto libre.
   */
  async merge(targetId: string, sourceId: string): Promise<Brand> {
    if (targetId === sourceId) {
      throw new BadRequestException('No puedes fusionar una marca consigo misma');
    }
    return this.dataSource.transaction(async (m) => {
      const target = await m.findOne(Brand, { where: { id: targetId } });
      const source = await m.findOne(Brand, { where: { id: sourceId } });
      if (!target || !source) throw new NotFoundException('Marca no encontrada');

      for (const table of BRAND_TABLES) {
        await m.query(
          `UPDATE "${table}" SET "brandId" = $1 WHERE "brandId" = $2`,
          [targetId, sourceId],
        );
      }

      const mergedAliases = new Set<string>([
        ...(target.aliases ?? []),
        ...(source.aliases ?? []),
        source.name,
      ]);
      target.aliases = [...mergedAliases].filter(
        (a) => normalizeBrand(a) !== target.slug,
      );
      await m.save(target);
      await m.remove(source);
      this.logger.log(`Marca fusionada: "${source.name}" → "${target.name}"`);
      return target;
    });
  }

  /** Borra una marca solo si no tiene productos asociados (si no, fusiona/desactiva). */
  async remove(id: string): Promise<{ message: string }> {
    const brand = await this.findOne(id);
    const counts = (await this.countsByBrand()).get(id) ?? this.emptyCounts();
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total > 0) {
      throw new BadRequestException(
        `La marca "${brand.name}" tiene ${total} productos asociados. Fusiónala con otra o desactívala en vez de borrarla.`,
      );
    }
    await this.brandRepo.remove(brand);
    return { message: `Marca "${brand.name}" eliminada` };
  }

  private emptyCounts(): Record<string, number> {
    return { filaments: 0, filamentCatalog: 0, printers: 0, printerCatalog: 0 };
  }

  /** Conteo de productos por brandId en las 4 tablas, en un mapa brandId→counts. */
  private async countsByBrand(): Promise<Map<string, Record<string, number>>> {
    const repos: Array<[keyof ReturnType<BrandsService['emptyCounts']>, Repository<{ brandId?: string | null }>]> = [
      ['filaments', this.filamentRepo as never],
      ['filamentCatalog', this.filamentCatalogRepo as never],
      ['printers', this.printerRepo as never],
      ['printerCatalog', this.printerCatalogRepo as never],
    ];
    const map = new Map<string, Record<string, number>>();
    for (const [key, repo] of repos) {
      const rows: Array<{ brandId: string; n: string }> = await repo
        .createQueryBuilder('t')
        .select('t.brandId', 'brandId')
        .addSelect('COUNT(*)', 'n')
        .where('t.brandId IS NOT NULL')
        .groupBy('t.brandId')
        .getRawMany();
      for (const r of rows) {
        const c = map.get(r.brandId) ?? this.emptyCounts();
        c[key] = Number(r.n);
        map.set(r.brandId, c);
      }
    }
    return map;
  }
}
