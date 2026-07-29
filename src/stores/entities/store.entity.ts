import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Tienda donde comprar filamento (tarjeta con enlace externo) que se muestra
 * en la página de Filamentos, junto a las ofertas. Las cura el admin; espejo
 * del módulo de ofertas (`filament_offers`).
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
