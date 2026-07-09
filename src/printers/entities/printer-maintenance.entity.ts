import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Printer } from './printer.entity.js';

/**
 * Registro del historial de mantenimientos de una impresora: cada vez que el
 * maker marca un mantenimiento como hecho se guarda una entrada con la fecha,
 * el tipo, las horas de la máquina en ese momento y una nota opcional
 * ("ha pasado esto, he hecho esto…").
 */
@Entity('printer_maintenances')
export class PrinterMaintenance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  printerId!: string;

  @ManyToOne(() => Printer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'printerId' })
  printer?: Printer;

  // varchar (no enum de Postgres): los valores válidos los garantiza el DTO.
  @Column({ length: 10 })
  type!: 'simple' | 'full';

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  // Horas totales de la máquina en el momento del mantenimiento (snapshot).
  @Column('int', { nullable: true })
  printerHours!: number | null;

  @CreateDateColumn()
  createdAt!: Date;
}
