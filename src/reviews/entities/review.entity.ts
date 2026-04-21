import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Project } from '../../projects/entities/project.entity.js';

@Entity('reviews')
@Unique(['author', 'project']) // Un maker solo puede dejar una reseña por proyecto
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  rating!: number; // 1–5 estrellas

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  author!: User;

  @ManyToOne(() => Project, (project) => project.reviews, {
    onDelete: 'CASCADE',
  })
  project!: Project;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
