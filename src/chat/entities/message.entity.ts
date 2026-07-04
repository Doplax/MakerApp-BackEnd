import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Conversation } from './conversation.entity.js';

/**
 * Referencia a un proyecto adjunta a un mensaje (p. ej. "Pedir presupuesto"
 * enlaza el producto del que se habla). Es un **snapshot** que se DERIVA en el
 * servidor a partir del proyecto real (nunca se confía en lo que manda el
 * cliente): así la tarjeta se pinta sin llamadas extra y sobrevive aunque el
 * proyecto cambie o se borre después.
 */
export interface MessageProjectAttachment {
  type: 'project';
  projectId: string;
  makerId: string;
  name: string;
  imageUrl: string | null;
  price: number | null;
}

export type MessageAttachment = MessageProjectAttachment;

@Entity('messages')
@Index(['conversation', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: 'CASCADE' })
  conversation!: Conversation;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  sender!: User;

  @Column({ type: 'text' })
  body!: string;

  /** Adjunto opcional (referencia a un proyecto). Snapshot derivado en servidor. */
  @Column({ type: 'jsonb', nullable: true })
  attachment!: MessageAttachment | null;

  @CreateDateColumn()
  createdAt!: Date;
}
