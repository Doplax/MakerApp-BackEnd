import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Purchase } from '../../purchases/entities/purchase.entity.js';

/**
 * Reseña que un comprador (author) deja al maker tras una compra completada.
 * Una reseña por compra (Unique en purchase).
 */
@Entity('maker_reviews')
@Unique(['purchase'])
@Index(['maker'])
export class MakerReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  rating!: number; // 1–5

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  author!: User;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  maker!: User;

  @ManyToOne(() => Purchase, { eager: false, onDelete: 'CASCADE' })
  purchase!: Purchase;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
