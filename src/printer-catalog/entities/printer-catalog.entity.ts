import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('printer_catalog')
export class PrinterCatalog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  brand!: string;

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
