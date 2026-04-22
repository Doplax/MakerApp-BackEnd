import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { PrintStatus } from '../../common/enums/index.js';
import { Filament } from '../../filaments/entities/filament.entity.js';
import { Printer } from '../../printers/entities/printer.entity.js';
import { Project } from '../../projects/entities/project.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('print_logs')
export class PrintLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column('float')
  weightUsed!: number; // gramos de filamento usados

  @Column('float', { nullable: true })
  printDuration!: number; // duración en minutos

  @Column({
    type: 'enum',
    enum: PrintStatus,
    default: PrintStatus.COMPLETED,
  })
  status!: PrintStatus;

  @Column({ type: 'timestamp', nullable: true })
  printStartedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ nullable: true })
  imageUrl!: string;

  @Column({ type: 'int', nullable: true, default: 1 })
  copies!: number;

  @ManyToOne(() => Filament, (filament) => filament.printLogs, {
    eager: true,
    onDelete: 'CASCADE',
  })
  filament!: Filament;

  @ManyToOne(() => Printer, (printer) => printer.printLogs, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  printer!: Printer;

  @ManyToOne(() => Project, (project) => project.printLogs, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  project!: Project;

  @ManyToOne(() => User, { eager: false })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
