import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { MaterialType, FilamentStatus } from '../../common/enums/index.js';
import { User } from '../../users/entities/user.entity.js';
import { PrintLog } from '../../print-logs/entities/print-log.entity.js';
import { FilamentCatalog } from '../../filament-catalog/entities/filament-catalog.entity.js';
import { Project } from '../../projects/entities/project.entity.js';

@Entity('filaments')
export class Filament {
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

  @Column('int')
  totalWeight!: number;

  @Column('float')
  remainingWeight!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  price!: number;

  @Column({ default: 'EUR', length: 3 })
  currency!: string;

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

  @Column({
    type: 'enum',
    enum: FilamentStatus,
    default: FilamentStatus.AVAILABLE,
  })
  status!: FilamentStatus;

  @Column({ type: 'date', nullable: true })
  purchaseDate!: Date;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ nullable: true })
  imageUrl!: string;

  @Column({ nullable: true, length: 50 })
  spoolType!: string;

  @Column({ default: false })
  isPublic!: boolean;

  @ManyToOne(() => FilamentCatalog, { eager: true, nullable: true })
  catalogFilament!: FilamentCatalog;

  @ManyToOne(() => User, (user) => user.filaments, { eager: false })
  createdBy!: User;

  @ManyToMany(() => Project, (project) => project.filaments)
  projects!: Project[];

  @OneToMany(() => PrintLog, (log) => log.filament, { eager: false })
  printLogs!: PrintLog[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  /**
   * Porcentaje de filamento restante
   */
  get remainingPercentage(): number {
    if (this.totalWeight === 0) return 0;
    return Math.round((this.remainingWeight / this.totalWeight) * 100);
  }
}
