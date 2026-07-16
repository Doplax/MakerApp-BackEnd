import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Accesorio o recambio de impresora (tarjeta curada con imagen + enlace) que se
 * muestra en la ficha de la impresora del maker, emparejado por MARCA (y modelo
 * opcional). Los cura el admin; idea de producto: que las marcas paguen por
 * aparecer aquí. `kind` distingue accesorio vs recambio.
 */
export type PrinterAccessoryKind = 'accessory' | 'spare';

@Entity('printer_accessories')
export class PrinterAccessory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20, default: 'accessory' })
  kind!: PrinterAccessoryKind;

  @Column({ length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // Marca compatible (se empareja con printer.brand, case-insensitive).
  @Column({ type: 'varchar', length: 100, nullable: true })
  brand!: string | null;

  // Compatibilidad legible ("Compatible con Bambu Lab H2S Series").
  @Column({ type: 'varchar', length: 200, nullable: true })
  compatibility!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url!: string | null;

  @Column({ type: 'varchar', nullable: true })
  imageUrl!: string | null;

  @Column({ default: true })
  isActive!: boolean;

  // Orden de aparición (menor = primero → el primero es el "destacado").
  @Column('int', { default: 0 })
  sortOrder!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
