import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MaterialType } from '../../common/enums/index.js';

@Entity('filament_catalog')
export class FilamentCatalog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  brand!: string;

  @Column({ type: 'enum', enum: MaterialType, default: MaterialType.PLA })
  material!: MaterialType;

  @Column({ length: 50 })
  color!: string;

  @Column({ nullable: true, length: 7 })
  colorHex!: string;

  @Column('float', { default: 1.75 })
  diameter!: number;

  @Column('float', { default: 1.24 })
  density!: number;

  @Column('int', { default: 1000 })
  defaultWeight!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  referencePrice!: number;

  @Column({ default: 'EUR', length: 3 })
  currency!: string;

  @Column({ nullable: true, length: 500 })
  purchaseUrl!: string;

  @Column({ nullable: true, length: 100 })
  supplier!: string;

  @Column({ type: 'int', nullable: true })
  printTempMin!: number;

  @Column({ type: 'int', nullable: true })
  printTempMax!: number;

  @Column({ type: 'int', nullable: true })
  bedTempMin!: number;

  @Column({ type: 'int', nullable: true })
  bedTempMax!: number;

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
