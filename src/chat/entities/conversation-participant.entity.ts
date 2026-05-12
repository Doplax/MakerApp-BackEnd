import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Conversation } from './conversation.entity.js';

/**
 * Une un User con una Conversation y guarda metadatos del lado del usuario,
 * en particular el último timestamp de lectura para calcular no-leídos.
 */
@Entity('conversation_participants')
@Unique(['conversation', 'user'])
@Index(['user'])
export class ConversationParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Conversation, (c) => c.participants, {
    onDelete: 'CASCADE',
  })
  conversation!: Conversation;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'timestamp', nullable: true })
  lastReadAt!: Date | null;

  @CreateDateColumn()
  joinedAt!: Date;
}
