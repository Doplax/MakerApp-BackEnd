import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { PrintLog } from '../../print-logs/entities/print-log.entity.js';
import { Filament } from '../../filaments/entities/filament.entity.js';
import { Review } from '../../reviews/entities/review.entity.js';
import { Printer } from '../../printers/entities/printer.entity.js';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'in_progress', 'completed', 'archived'],
    default: 'draft',
  })
  status!: string;

  // ── Kanban / pedido ────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: ['pending', 'in_progress', 'done'],
    nullable: true,
  })
  kanbanStatus!: string | null; // null = sin pedido activo

  @Column({ type: 'timestamp', nullable: true })
  orderDeadline!: Date | null; // fecha límite del pedido

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price!: number | null; // precio del proyecto/pedido (€)

  // ── Visibilidad ────────────────────────────────────────────
  @Column({ default: false })
  isPublic!: boolean; // visible en perfil público del maker

  // ── Tipo de diseño ────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: ['own', 'licensed'],
    default: 'own',
  })
  designType!: string; // 'own' = diseño propio, 'licensed' = con licencia

  @Column({ type: 'varchar', nullable: true })
  licenseFileUrl!: string | null; // URL del archivo de licencia adjunto

  @Column({ nullable: true })
  imageUrl!: string;

  @Column({ nullable: true })
  stlFileUrl!: string;

  @Column('float', { nullable: true })
  estimatedWeight!: number;

  @Column('float', { nullable: true })
  estimatedTime!: number; // en minutos

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ type: 'int', nullable: true, default: 1 })
  pendingCopies!: number | null;

  @ManyToOne(() => User, (user) => user.projects, { eager: false })
  createdBy!: User;

  @ManyToOne(() => Printer, { eager: true, nullable: true })
  printer!: Printer | null;

  @ManyToMany(() => Filament, (filament) => filament.projects, { eager: false })
  @JoinTable({ name: 'project_filaments' })
  filaments!: Filament[];

  @OneToMany(() => PrintLog, (log) => log.project, { eager: false })
  printLogs!: PrintLog[];

  @OneToMany(() => Review, (review) => review.project, { eager: false })
  reviews!: Review[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
