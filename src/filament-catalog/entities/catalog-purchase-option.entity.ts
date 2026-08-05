import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FilamentCatalog } from './filament-catalog.entity.js';

/**
 * Opción de compra de un filamento del CATÁLOGO (ago-2026): un mismo filamento
 * (p. ej. "PLA Blanco de Sakata") se vende en varias tiendas/distribuidores,
 * cada uno con su web, su precio y su valoración. Alimenta el popup
 * "Comprar en tienda" (comparador) del catálogo de Filamentos.
 *
 * Las cura el ADMIN a mano (como las ofertas de filamento): precio y
 * valoración son un snapshot manual, NO hay scraping ni actualización
 * automática. `filament_catalog.purchaseUrl` se conserva como enlace único
 * de siempre y es el fallback cuando un ítem no tiene opciones.
 */
@Entity('catalog_purchase_options')
export class CatalogPurchaseOption {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  catalogId!: string;

  @ManyToOne(() => FilamentCatalog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'catalogId' })
  catalog?: FilamentCatalog;

  /** Nombre del proveedor/tienda (p. ej. "GCode28"). */
  @Column({ length: 120 })
  vendorName!: string;

  /** Logo del proveedor (sube el admin → contrato de limpieza + barredor). */
  @Column({ type: 'varchar', nullable: true })
  vendorLogoUrl!: string | null;

  /** Enlace a la página del producto en la tienda del proveedor. */
  @Column({ length: 500 })
  url!: string;

  /** Precio en EUR (snapshot manual del admin; puede quedar vacío). */
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  price!: string | null;

  /** Valoración de la tienda 0–5 (manual, p. ej. 4.8). */
  @Column('decimal', { precision: 2, scale: 1, nullable: true })
  rating!: string | null;

  @Column({ default: true })
  isActive!: boolean;

  /** Orden de aparición (menor = primero; a igual orden, por precio). */
  @Column('int', { default: 0 })
  sortOrder!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
