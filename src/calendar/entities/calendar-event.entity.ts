import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

/**
 * Tarea/evento del calendario del maker (mantenimientos, entregas,
 * recordatorios…). Cada evento pertenece a UN maker (createdBy); el widget
 * del dashboard enseña el próximo pendiente y la página /home/calendar los
 * gestiona todos.
 */
@Entity('calendar_events')
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  /** Fecha y hora del evento (con zona; el front la muestra en local). */
  @Column({ type: 'timestamptz' })
  startsAt!: Date;

  @Column({ default: false })
  done!: boolean;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
