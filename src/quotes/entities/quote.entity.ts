import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

/**
 * PRESUPUESTO guardado (historial). NO es una factura: es el documento
 * informal/proforma que el maker genera desde el invoice-modal (proyecto o
 * calculadora). Se guarda como snapshot (cliente + importes en céntimos,
 * IVA por encima de la base) para poder re-generar el mismo PDF después.
 */
@Entity('quotes')
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Referencia visible del presupuesto (editable por el maker): "20260713-001". */
  @Column({ type: 'varchar', length: 30 })
  reference!: string;

  /** Concepto (nombre del proyecto/pieza en el momento de generarlo). */
  @Column({ type: 'varchar', length: 200, nullable: true })
  concept!: string | null;

  // ── Snapshot del cliente ─────────────────────────────────────
  @Column({ type: 'varchar', length: 200, nullable: true })
  clientName!: string | null;
  @Column({ type: 'varchar', length: 30, nullable: true })
  clientNif!: string | null;
  @Column({ type: 'varchar', length: 300, nullable: true })
  clientAddress!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // ── Importes (céntimos; IVA POR ENCIMA de la base, como el PDF) ──
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

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
