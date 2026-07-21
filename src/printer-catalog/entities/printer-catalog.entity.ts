import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Brand } from '../../brands/entities/brand.entity.js';

@Entity('printer_catalog')
export class PrinterCatalog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  brand!: string;

  // Marca estructurada (opcional). Ver Brand/AddBrands.
  @Column({ type: 'uuid', nullable: true })
  brandId?: string | null;

  @ManyToOne(() => Brand, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'brandId' })
  brandRef?: Brand | null;

  @Column({ length: 100 })
  model!: string;

  // varchar (no enum de Postgres): la migración y synchronize generan así el
  // mismo esquema; los valores válidos los garantiza el DTO (@IsIn).
  @Column({ length: 10, default: 'FDM' })
  type!: string;

  @Column('int', { nullable: true })
  buildVolumeX!: number;

  @Column('int', { nullable: true })
  buildVolumeY!: number;

  @Column('int', { nullable: true })
  buildVolumeZ!: number;

  @Column('float', { nullable: true })
  nozzleDiameter!: number;

  @Column('int', { nullable: true })
  powerConsumption!: number;

  // Ficha técnica (opcional): temperatura máx de extrusor/cama, velocidad máx y
  // nº de extrusores/cabezales. Autorrellena el alta de impresora del usuario.
  @Column('int', { nullable: true })
  extruderMaxTemp!: number | null;

  @Column('int', { nullable: true })
  bedMaxTemp!: number | null;

  @Column('int', { nullable: true })
  maxSpeed!: number | null;

  @Column('int', { nullable: true })
  extruderCount!: number | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  referencePrice!: number;

  @Column({ default: 'EUR', length: 3 })
  currency!: string;

  @Column({ nullable: true, length: 500 })
  purchaseUrl!: string;

  @Column({ nullable: true })
  imageUrl!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
