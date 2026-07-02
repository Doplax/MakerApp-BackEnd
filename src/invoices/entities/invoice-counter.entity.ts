import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * Contador correlativo de facturas por maker y serie (año). Garantiza una
 * numeración sin huecos y sin duplicados (art. 6 RD 1619/2012). Se incrementa
 * DENTRO de la transacción de emisión con bloqueo pesimista.
 */
@Entity('invoice_counters')
@Unique(['makerId', 'series'])
export class InvoiceCounter {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  makerId!: string;

  @Column({ type: 'varchar', length: 10 })
  series!: string;

  @Column({ type: 'int', default: 0 })
  lastNumber!: number;
}
