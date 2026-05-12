import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Project } from '../../projects/entities/project.entity.js';
import { PurchaseStatus } from '../enums/purchase-status.enum.js';

@Entity('purchases')
@Index(['maker', 'buyer'])
export class Purchase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'SET NULL', nullable: true })
  buyer!: User | null;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  maker!: User;

  @ManyToOne(() => Project, { eager: false, onDelete: 'SET NULL', nullable: true })
  project!: Project | null;

  @Column({ type: 'int' })
  amount!: number; // céntimos

  @Column({ type: 'varchar', length: 10, default: 'eur' })
  currency!: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  paymentIntentId!: string | null;

  @Column({
    type: 'enum',
    enum: PurchaseStatus,
    default: PurchaseStatus.PENDING,
  })
  status!: PurchaseStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
