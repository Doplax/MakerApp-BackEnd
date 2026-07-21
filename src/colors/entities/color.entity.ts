import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Color estándar de filamento (nombre + swatch CSS). Fuente ÚNICA de colores de
 * la app, servida por `GET /colors` y consumida por los selectores del front
 * (p. ej. el picker del formulario de presupuesto). Se siembra un set base al
 * arrancar (idempotente por `name`); el admin puede añadir/editar más.
 */
@Entity('colors')
export class Color {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Nombre visible / valor del color (único, case-insensitive por índice).
  @Index({ unique: true })
  @Column({ length: 60 })
  name!: string;

  // Background CSS del swatch: hex (#RRGGBB) o gradiente CSS.
  @Column({ length: 200 })
  swatch!: string;

  @Column({ default: true })
  isActive!: boolean;

  // Orden de aparición en el selector (menor = primero).
  @Column('int', { default: 0 })
  sortOrder!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
