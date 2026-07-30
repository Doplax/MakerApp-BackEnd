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
import type { ShippingRate } from '../data/default-shipping-carriers.js';

/**
 * Preset de envío del maker (Ajustes → Envíos). Guarda un transportista con
 * su tabla de tarifas por tramo de peso, para poder cobrar el envío según
 * lo que pese el pedido en vez del importe único de `users.shippingCostDefault`
 * (que sigue existiendo y no se toca: es el fallback cuando no hay preset).
 *
 * Es SIEMPRE una copia propia del maker: nace precargado desde el catálogo que
 * facilitamos nosotros (`DEFAULT_SHIPPING_CARRIERS`) y a partir de ahí él edita
 * sus precios. `carrierCode` solo recuerda el origen; si mañana cambiamos el
 * catálogo, los presets ya creados NO se alteran.
 */
@Entity('shipping_presets')
export class ShippingPreset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Nombre visible del preset (p. ej. "Correos - Paq estándar"). */
  @Column({ length: 120 })
  name!: string;

  /** Nombre del proveedor (p. ej. "Correos"). */
  @Column({ length: 120 })
  carrierName!: string;

  /**
   * Código del transportista del catálogo del que se precargó, o null si el
   * maker lo creó a mano. Es informativo: NO es una FK ni se usa para releer
   * tarifas (las del preset son las que manda).
   */
  @Column({ type: 'varchar', length: 60, nullable: true })
  carrierCode!: string | null;

  /**
   * Tramos de peso `{ minWeight, maxWeight, price }` (kg / kg / €), ordenados
   * de menor a mayor y sin solaparse — lo valida el servicio, no la BD.
   * jsonb (no tabla hija): se leen y se guardan siempre como bloque completo.
   */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  rates!: ShippingRate[];

  /**
   * Preset por defecto del maker. El servicio garantiza **como máximo uno**
   * por usuario (al marcar uno, desmarca el resto).
   */
  @Column({ default: false })
  isDefault!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  /** Orden de aparición en la lista de Ajustes (menor = primero). */
  @Column('int', { default: 0 })
  sortOrder!: number;

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
