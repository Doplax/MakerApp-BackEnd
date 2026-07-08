import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Oferta de filamento (tarjeta con enlace externo) que se muestra en la
 * página de Filamentos. Al principio las cura el admin a mano; la idea de
 * producto es que más adelante las marcas paguen por publicarse aquí.
 */
@Entity('filament_offers')
export class FilamentOffer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  title!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // Texto libre del precio/oferta (p. ej. "19,99 € (-25 %)"): las ofertas
  // vienen de tiendas externas, sin moneda ni formato garantizados.
  @Column({ type: 'varchar', length: 100, nullable: true })
  priceText!: string | null;

  @Column({ length: 500 })
  url!: string;

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
