import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Marca (fabricante) de filamentos y/o impresoras. Se introdujo (jul-2026) para
 * poder gestionarlas, verlas con sus productos asociados y filtrar por marca. La
 * columna de texto `brand` de las tablas existentes se conserva como display; la
 * relación `brandId` es el enlace estructurado. Ver migración AddBrands.
 */
@Entity('brands')
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Nombre canónico para mostrar (p. ej. "Bambu Lab"). */
  @Index({ unique: true })
  @Column({ length: 100 })
  name!: string;

  /** Clave normalizada (normalizeBrand) para dedupe y reconciliación en escritura. */
  @Index({ unique: true })
  @Column({ length: 120 })
  slug!: string;

  /** Variantes de escritura que también resuelven a esta marca ("Bambulab", …). */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  aliases!: string[];

  /** 'filament' | 'printer' | 'both' — ámbito de la marca (informativo/filtro). */
  @Column({ length: 20, default: 'both' })
  scope!: string;

  @Column({ type: 'varchar', nullable: true })
  logoUrl?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  website?: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
