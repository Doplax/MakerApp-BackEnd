import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity.js';
import { ConversationParticipant } from './entities/conversation-participant.entity.js';
import { Message } from './entities/message.entity.js';
import { User } from '../users/entities/user.entity.js';

export interface ConversationSummary {
  id: string;
  otherUser: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  lastMessage: {
    body: string;
    createdAt: Date;
    fromMe: boolean;
  } | null;
  unreadCount: number;
  updatedAt: Date;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private readonly participantRepo: Repository<ConversationParticipant>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Devuelve la conversación 1:1 existente entre los dos usuarios, o la crea
   * si no existe. Idempotente.
   */
  async startOrGetDirectConversation(
    currentUser: User,
    otherUserId: string,
  ): Promise<Conversation> {
    if (currentUser.id === otherUserId) {
      throw new BadRequestException(
        'No puedes iniciar una conversación contigo mismo',
      );
    }

    const otherUser = await this.userRepo.findOne({
      where: { id: otherUserId },
    });
    if (!otherUser) throw new NotFoundException('Usuario no encontrado');

    // Buscar una conversación que contenga exactamente a estos dos usuarios.
    const existing = await this.conversationRepo
      .createQueryBuilder('c')
      .innerJoin('c.participants', 'p1', 'p1.userId = :a', {
        a: currentUser.id,
      })
      .innerJoin('c.participants', 'p2', 'p2.userId = :b', { b: otherUserId })
      .where(
        (qb) =>
          `(SELECT COUNT(*) FROM conversation_participants cp WHERE cp.conversationId = c.id) = 2`,
      )
      .getOne();

    if (existing) return existing;

    const conversation = this.conversationRepo.create({
      lastMessageAt: null,
    });
    await this.conversationRepo.save(conversation);

    const participants = [currentUser, otherUser].map((u) =>
      this.participantRepo.create({ conversation, user: u, lastReadAt: null }),
    );
    await this.participantRepo.save(participants);

    return conversation;
  }

  /**
   * Lista de conversaciones del usuario, ordenadas por actividad reciente,
   * con el último mensaje y el contador de no-leídos.
   */
  async listForUser(currentUser: User): Promise<ConversationSummary[]> {
    const memberships = await this.participantRepo.find({
      where: { user: { id: currentUser.id } },
      relations: ['conversation'],
    });
    if (memberships.length === 0) return [];

    const conversationIds = memberships.map((m) => m.conversation.id);

    const conversations = await this.conversationRepo.find({
      where: conversationIds.map((id) => ({ id })),
      relations: ['participants', 'participants.user'],
      order: { lastMessageAt: 'DESC', updatedAt: 'DESC' },
    });

    const lastReadByConv = new Map<string, Date | null>();
    memberships.forEach((m) =>
      lastReadByConv.set(m.conversation.id, m.lastReadAt),
    );

    const summaries: ConversationSummary[] = [];
    for (const c of conversations) {
      const other = c.participants.find(
        (p) => p.user.id !== currentUser.id,
      )?.user;
      if (!other) continue;

      const lastMessage = await this.messageRepo.findOne({
        where: { conversation: { id: c.id } },
        order: { createdAt: 'DESC' },
      });

      const lastReadAt = lastReadByConv.get(c.id);
      const unreadQb = this.messageRepo
        .createQueryBuilder('m')
        .where('m.conversationId = :cid', { cid: c.id })
        .andWhere('m.senderId != :uid', { uid: currentUser.id });
      if (lastReadAt) {
        unreadQb.andWhere('m.createdAt > :lastRead', { lastRead: lastReadAt });
      }
      const unreadCount = await unreadQb.getCount();

      summaries.push({
        id: c.id,
        otherUser: {
          id: other.id,
          fullName: other.fullName,
          avatarUrl: other.avatarUrl ?? null,
        },
        lastMessage: lastMessage
          ? {
              body: lastMessage.body,
              createdAt: lastMessage.createdAt,
              fromMe: lastMessage.sender.id === currentUser.id,
            }
          : null,
        unreadCount,
        updatedAt: c.lastMessageAt ?? c.updatedAt,
      });
    }

    return summaries;
  }

  async getConversation(
    currentUser: User,
    conversationId: string,
  ): Promise<ConversationSummary> {
    const c = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['participants', 'participants.user'],
    });
    if (!c) throw new NotFoundException('Conversación no encontrada');
    this.ensureMember(c, currentUser.id);

    const other = c.participants.find((p) => p.user.id !== currentUser.id)
      ?.user;
    if (!other) throw new NotFoundException('Conversación inválida');

    const lastMessage = await this.messageRepo.findOne({
      where: { conversation: { id: c.id } },
      order: { createdAt: 'DESC' },
    });

    return {
      id: c.id,
      otherUser: {
        id: other.id,
        fullName: other.fullName,
        avatarUrl: other.avatarUrl ?? null,
      },
      lastMessage: lastMessage
        ? {
            body: lastMessage.body,
            createdAt: lastMessage.createdAt,
            fromMe: lastMessage.sender.id === currentUser.id,
          }
        : null,
      unreadCount: 0,
      updatedAt: c.lastMessageAt ?? c.updatedAt,
    };
  }

  async listMessages(
    currentUser: User,
    conversationId: string,
    opts: { limit?: number; before?: string } = {},
  ): Promise<Message[]> {
    const c = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['participants', 'participants.user'],
    });
    if (!c) throw new NotFoundException('Conversación no encontrada');
    this.ensureMember(c, currentUser.id);

    const limit = Math.min(opts.limit ?? 50, 100);
    const before = opts.before ? new Date(opts.before) : null;

    const where: Record<string, unknown> = { conversation: { id: c.id } };
    if (before && !Number.isNaN(before.getTime())) {
      where.createdAt = LessThan(before);
    }

    // Carga descendente y la invierte para que el cliente la pinte cronológica.
    const items = await this.messageRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return items.reverse();
  }

  async sendMessage(
    currentUser: User,
    conversationId: string,
    body: string,
  ): Promise<Message> {
    const c = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['participants', 'participants.user'],
    });
    if (!c) throw new NotFoundException('Conversación no encontrada');
    this.ensureMember(c, currentUser.id);

    const message = this.messageRepo.create({
      conversation: c,
      sender: currentUser,
      body: body.trim(),
    });
    const saved = await this.messageRepo.save(message);

    c.lastMessageAt = saved.createdAt;
    await this.conversationRepo.save(c);

    return saved;
  }

  async markAsRead(currentUser: User, conversationId: string): Promise<void> {
    const participant = await this.participantRepo.findOne({
      where: {
        conversation: { id: conversationId },
        user: { id: currentUser.id },
      },
    });
    if (!participant) {
      throw new ForbiddenException('No tienes acceso a esta conversación');
    }
    participant.lastReadAt = new Date();
    await this.participantRepo.save(participant);
  }

  private ensureMember(c: Conversation, userId: string): void {
    const isMember = c.participants.some((p) => p.user.id === userId);
    if (!isMember) {
      throw new ForbiddenException('No tienes acceso a esta conversación');
    }
  }
}
