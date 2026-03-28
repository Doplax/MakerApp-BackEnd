import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { PrintLog } from '../../print-logs/entities/print-log.entity.js';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'in_progress', 'completed', 'archived'],
    default: 'draft',
  })
  status!: string;

  @Column({ nullable: true })
  imageUrl!: string;

  @Column({ nullable: true })
  stlFileUrl!: string;

  @Column('float', { nullable: true })
  estimatedWeight!: number;

  @Column('float', { nullable: true })
  estimatedTime!: number; // en minutos

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @ManyToOne(() => User, (user) => user.projects, { eager: false })
  createdBy!: User;

  @OneToMany(() => PrintLog, (log) => log.project, { eager: false })
  printLogs!: PrintLog[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
