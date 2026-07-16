import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Brand } from '../../brands/entities/brand.entity.js';
import { PrintLog } from '../../print-logs/entities/print-log.entity.js';

@Entity('printers')
export class Printer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  name!: string;

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

  @Column({ type: 'enum', enum: ['FDM', 'SLA', 'SLS', 'DLP'], default: 'FDM' })
  type!: string;

  @Column('int', { nullable: true })
  buildVolumeX!: number;

  @Column('int', { nullable: true })
  buildVolumeY!: number;

  @Column('int', { nullable: true })
  buildVolumeZ!: number;

  // Boquilla "principal" (legacy). Se mantiene sincronizada con la primera de
  // `nozzleDiameters` para no romper lecturas existentes.
  @Column('float', { nullable: true })
  nozzleDiameter!: number;

  // Boquillas disponibles (multi-selección en el formulario: 0.2/0.4/0.6/0.8/1).
  @Column({ type: 'jsonb', nullable: true })
  nozzleDiameters!: number[] | null;

  // Horas de impresión que la máquina ya traía al darla de alta (segunda mano
  // o uso previo). Suman al total calculado desde los print-logs.
  @Column('int', { nullable: true })
  initialPrintHours!: number | null;

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

  // Número de serie (opcional; lo rellena el maker si quiere).
  @Column({ type: 'varchar', length: 100, nullable: true })
  serialNumber!: string | null;

  // Enlace a la tienda del modelo (viene del catálogo/Excel). Botón "Ver en tienda".
  @Column({ type: 'varchar', nullable: true })
  storeUrl!: string | null;

  // ── Características técnicas (opcionales; para la ficha) ────
  @Column({ type: 'int', nullable: true })
  extruderMaxTemp!: number | null; // °C

  @Column({ type: 'int', nullable: true })
  bedMaxTemp!: number | null; // °C

  @Column({ type: 'int', nullable: true })
  maxSpeed!: number | null; // mm/s

  @Column({ type: 'int', nullable: true })
  extruderCount!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location!: string | null; // Ubicación física (p. ej. "Estantería A")

  @Column({ type: 'varchar', nullable: true })
  printProfileUrl!: string | null; // Enlace al perfil de impresión

  @Column({ default: true })
  isActive!: boolean;

  // ── Precio y amortización ─────────────────────────────────
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  purchasePrice!: number; // Precio de compra (€)

  @Column({ type: 'int', nullable: true })
  amortizationMonths!: number; // Meses para amortizar (configurable)

  @Column({ type: 'int', nullable: true })
  powerConsumption!: number; // Consumo en vatios (W) para calculadora de coste

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
