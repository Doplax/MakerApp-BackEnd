import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Project } from '../../projects/entities/project.entity.js';
import { FavoriteList } from './favorite-list.entity.js';

/** Proyecto (de otro maker) marcado como favorito por un usuario. */
@Entity('project_favorites')
@Unique(['user', 'project'])
export class ProjectFavorite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  /** Lista en la que está agrupado el favorito (o null = sin lista). */
  @ManyToOne(() => FavoriteList, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'listId' })
  list!: FavoriteList | null;

  @CreateDateColumn()
  createdAt!: Date;
}
