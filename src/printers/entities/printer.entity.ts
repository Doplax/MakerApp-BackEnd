import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { PrintLog } from '../../print-logs/entities/print-log.entity.js';

@Entity('printers')
export class Printer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 100 })
  brand!: string;

  @Column({ length: 100 })
  model!: string;

  @Column({ type: 'enum', enum: ['FDM', 'SLA', 'SLS', 'DLP'], default: 'FDM' })
  type!: string;

  @Column('int', { nullable: true })
  buildVolumeX!: number;

  @Column('int', { nullable: true })
  buildVolumeY!: number;

  @Column('int', { nullable: true })
  buildVolumeZ!: number;

  @Column('float', { nullable: true })
  nozzleDiameter!: number;

  @Column({
    type: 'enum',
    enum: ['idle', 'printing', 'maintenance', 'offline'],
    default: 'idle',
  })
  status!: string;

  @Column({ type: 'date', nullable: true })
  purchaseDate!: Date;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ nullable: true })
  imageUrl!: string;

  @Column({ default: true })
  isActive!: boolean;

  // ── Precio y amortización ─────────────────────────────────
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  purchasePrice!: number; // Precio de compra (€)

  @Column({ type: 'int', nullable: true })
  amortizationMonths!: number; // Meses para amortizar (configurable)

  // ── Mantenimiento ─────────────────────────────────────────
  @Column({ type: 'int', default: 300 })
  maintenanceSimpleHours!: number; // Cada cuántas horas — mantenimiento simple

  @Column({ type: 'int', default: 500 })
  maintenanceFullHours!: number; // Cada cuántas horas — mantenimiento completo

  @Column({ type: 'timestamp', nullable: true })
  lastMaintenanceSimpleAt!: Date; // Última vez que se hizo mantenimiento simple

  @Column({ type: 'timestamp', nullable: true })
  lastMaintenanceFullAt!: Date; // Última vez que se hizo mantenimiento completo

  @ManyToOne(() => User, (user) => user.printers, { eager: false })
  createdBy!: User;

  @OneToMany(() => PrintLog, (log) => log.printer, { eager: false })
  printLogs!: PrintLog[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
