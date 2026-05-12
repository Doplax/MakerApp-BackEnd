import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ConversationParticipant } from './conversation-participant.entity.js';
import { Message } from './message.entity.js';

/**
 * Conversación entre 2 o más usuarios.
 * El modelo soporta grupos en el futuro vía la tabla de participantes,
 * pero por ahora la API solo expone 1:1.
 */
@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Timestamp del último mensaje, mantenido en sincronía por el servicio
   *  para ordenar listas sin joins costosos. */
  @Index()
  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt!: Date | null;

  @OneToMany(() => ConversationParticipant, (p) => p.conversation, {
    cascade: ['insert'],
  })
  participants!: ConversationParticipant[];

  @OneToMany(() => Message, (m) => m.conversation)
  messages!: Message[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
