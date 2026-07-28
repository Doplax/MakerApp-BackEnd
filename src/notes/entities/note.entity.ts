import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity.js';
import { User } from '../../users/entities/user.entity.js';

/** Colores de tarjeta permitidos (tinte suave en el front). */
export const NOTE_COLORS = [
  'purple',
  'green',
  'blue',
  'amber',
  'pink',
  'gray',
] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

/**
 * Nota del taller (pantalla "Notas" tipo Google Keep): general o asociada a
 * un proyecto del maker. Colección NUEVA e independiente de `projects.notes`
 * (el campo de texto del formulario de proyecto), que sigue igual.
 */
@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  title!: string;

  /** Cuerpo libre; las líneas "[ ] " / "[x] " se pintan como checklist. */
  @Column({ type: 'text', default: '' })
  content!: string;

  @Column({ type: 'varchar', length: 20, default: 'purple' })
  color!: NoteColor;

  /** Fijada: se ordena primero en el listado. */
  @Column({ default: false })
  pinned!: boolean;

  /** Proyecto opcional al que pertenece la nota (null = nota general). */
  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  project!: Project | null;

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
