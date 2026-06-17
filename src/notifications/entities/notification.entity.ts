import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { NotificationType } from '../enums/notification-type.enum.js';

@Entity('notifications')
@Index(['userId', 'read'])
@Index(['userId', 'dedupeKey'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /** FK explícita: simplifica y hace fiables las consultas update/delete/where. */
  @Column()
  userId!: string;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column({ length: 160 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  /** Ruta interna a la que navega la notificación al pulsarla (ej: /home/printers/:id). */
  @Column({ type: 'varchar', nullable: true })
  link!: string | null;

  /** Metadatos para que el frontend renderice el texto traducido (printerId, etc.). */
  @Column({ type: 'jsonb', nullable: true })
  data!: Record<string, unknown> | null;

  /**
   * Clave de deduplicación: evita crear la misma notificación repetidas veces.
   * Para mantenimiento se compone de tipo + impresora + fecha del último
   * mantenimiento, de modo que al marcar el mantenimiento como hecho la clave
   * cambia y se podrá volver a notificar en el siguiente ciclo.
   */
  @Column({ type: 'varchar', nullable: true })
  dedupeKey!: string | null;

  @Column({ default: false })
  read!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  /**
   * Soft-delete: al "borrar" una notificación se marca esta fecha en lugar de
   * eliminarla de la BD. La bandeja excluye las archivadas; el histórico las
   * incluye (withDeleted). Así se conserva el historial permanente.
   */
  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;
}
