import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Purchase } from '../../purchases/entities/purchase.entity.js';
import { Project } from '../../projects/entities/project.entity.js';

/**
 * Factura emitida y PERSISTIDA (a diferencia del PDF client-side, esta es la
 * fuente legal). El número es correlativo por maker+serie (ver InvoiceCounter) y
 * único; los importes y los datos de las partes se guardan como "snapshot" para
 * que la factura sea reproducible aunque cambien el proyecto o el perfil fiscal.
 *
 * Convención de importes: el total es lo REALMENTE cobrado (compra), IVA
 * incluido. La base y la cuota se derivan del total (VAT-inclusive). Todo en
 * céntimos, como `Purchase.amount`.
 */
@Entity('invoices')
@Index(['maker', 'number'], { unique: true })
@Index(['purchase'], { unique: true })
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Número visible, correlativo: "2026-0001". */
  @Column({ type: 'varchar', length: 30 })
  number!: string;

  /** Serie (año) del contador correlativo. */
  @Column({ type: 'varchar', length: 10 })
  series!: string;

  @Column({ type: 'int' })
  sequence!: number;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  maker!: User;

  @ManyToOne(() => User, { eager: false, onDelete: 'SET NULL', nullable: true })
  buyer!: User | null;

  @ManyToOne(() => Purchase, { eager: false, onDelete: 'SET NULL', nullable: true })
  purchase!: Purchase | null;

  @ManyToOne(() => Project, { eager: false, onDelete: 'SET NULL', nullable: true })
  project!: Project | null;

  @Column({ type: 'timestamp' })
  issueDate!: Date;

  /** Concepto (nombre del proyecto en el momento de emitir). */
  @Column({ type: 'varchar', length: 200, nullable: true })
  concept!: string | null;

  // ── Snapshot del emisor (maker) ──────────────────────────────
  @Column({ type: 'varchar', length: 200, nullable: true })
  makerName!: string | null;
  @Column({ type: 'varchar', length: 20, nullable: true })
  makerNif!: string | null;
  @Column({ type: 'varchar', length: 300, nullable: true })
  makerAddress!: string | null;

  // ── Snapshot del cliente ─────────────────────────────────────
  @Column({ type: 'varchar', length: 200, nullable: true })
  clientName!: string | null;
  @Column({ type: 'varchar', length: 20, nullable: true })
  clientNif!: string | null;
  @Column({ type: 'varchar', length: 300, nullable: true })
  clientAddress!: string | null;

  // ── Importes (céntimos) ──────────────────────────────────────
  @Column({ type: 'int' })
  baseCents!: number;
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  vatPercent!: number;
  @Column({ type: 'int' })
  vatCents!: number;
  @Column({ type: 'int' })
  totalCents!: number;
  @Column({ type: 'varchar', length: 10, default: 'eur' })
  currency!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
