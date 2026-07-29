import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MaterialType } from '../../common/enums/index.js';

/**
 * Tienda de impresión 3D que vende filamento. Es un NEGOCIO FÍSICO: se
 * localiza en el mapa de makers (pin propio) y los makers la encuentran ahí
 * o en la vista de lista. Las cura el admin. Desde la página de Filamentos el
 * botón "Tiendas" lleva al mapa filtrado (`/home/makers-map?type=stores`).
 */
@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ length: 500 })
  url!: string;

  // Logo de la tienda. Puede ser una URL externa o una subida a /uploads
  // (en ese caso entra en el contrato de limpieza y en URL_COLUMNS).
  @Column({ type: 'varchar', nullable: true })
  imageUrl!: string | null;

  // ── Ubicación (negocio físico: se pinta en el mapa) ────────────
  // Misma precisión que `users.latitude/longitude` (decimal 10,7). Postgres
  // devuelve DECIMAL como string: el front coerciona con Number().
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude!: number | null;

  /** Dirección legible (la que se enseña en el popup y en la lista). */
  @Column({ type: 'varchar', length: 200, nullable: true })
  address!: string | null;

  /**
   * Materiales de filamento que vende (PLA, PETG, ABS, ASA…). `simple-array`
   * los persiste como texto separado por comas; lista vacía = no consta.
   */
  @Column({ type: 'simple-array', nullable: true })
  materials!: MaterialType[] | null;

  /** Si además de filamento vende impresoras 3D. */
  @Column({ default: false })
  sellsPrinters!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  // Orden de aparición (menor = primero).
  @Column('int', { default: 0 })
  sortOrder!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
