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
import { Message, MessageAttachment } from './entities/message.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { UserRole } from '../common/enums/index.js';
import { ChatGateway } from './chat.gateway.js';

/** Referencia (mínima) que el cliente adjunta; el snapshot se deriva en servidor. */
export interface AttachmentRef {
  type: 'project';
  projectId: string;
}

export interface ConversationSummary {
  id: string;
  otherUser: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    // false = CLIENTE (sin perfil público de maker): el front no debe enlazar
    // su cabecera a /public/maker/:id (daría 404).
    hasPublicProfile: boolean;
  };
  lastMessage: {
    body: string;
    createdAt: Date;
    fromMe: boolean;
  } | null;
  unreadCount: number;
  updatedAt: Date;
  /** Hasta cuándo ha leído el OTRO participante (para los recibos ✓✓). */
  otherLastReadAt: Date | null;
}

/** Vista pública de un mensaje (sin exponer el User completo del emisor). */
export interface MessageView {
  id: string;
  body: string;
  createdAt: Date;
  sender: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  attachment: MessageAttachment | null;
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
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly gateway: ChatGateway,
  ) {}

  /** Proyecta un Message a su vista pública (solo datos básicos del emisor). */
  private toMessageView(m: Message): MessageView {
    return {
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      sender: {
        id: m.sender.id,
        fullName: m.sender.fullName,
        avatarUrl: m.sender.avatarUrl ?? null,
      },
      attachment: m.attachment ?? null,
    };
  }

  /**
   * Construye el snapshot del adjunto DERIVÁNDOLO del proyecto real (nunca del
   * cliente). Solo se adjuntan proyectos **públicos**; si no existe o no es
   * público, se devuelve `null` (el mensaje se envía sin adjunto, no falla).
   */
  private async resolveAttachment(
    ref: AttachmentRef | undefined,
  ): Promise<MessageAttachment | null> {
    if (ref?.type !== 'project' || !ref.projectId) return null;
    const project = await this.projectRepo.findOne({
      where: { id: ref.projectId },
      relations: ['createdBy'],
    });
    if (!project || !project.isPublic || !project.createdBy) return null;
    return {
      type: 'project',
      projectId: project.id,
      makerId: project.createdBy.id,
      name: project.name,
      imageUrl: project.imageUrl ?? null,
      price: project.price != null ? Number(project.price) : null,
    };
  }

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
    // No revelamos la existencia de usuarios inactivos/baneados: se tratan igual
    // que si no existieran, coherente con jwt.strategy y el gateway del chat, que
    // también bloquean a los inactivos.
    if (!otherUser || !otherUser.isActive) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Buscar una conversación que contenga exactamente a estos dos usuarios.
    const existing = await this.conversationRepo
      .createQueryBuilder('c')
      .innerJoin('c.participants', 'p1', 'p1.userId = :a', {
        a: currentUser.id,
      })
      .innerJoin('c.participants', 'p2', 'p2.userId = :b', { b: otherUserId })
      .where(
        // Columna camelCase: hay que entrecomillarla o Postgres la busca en minúsculas.
        () =>
          `(SELECT COUNT(*) FROM conversation_participants cp WHERE cp."conversationId" = c.id) = 2`,
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
      const otherParticipant = c.participants.find(
        (p) => p.user.id !== currentUser.id,
      );
      const other = otherParticipant?.user;
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
          hasPublicProfile: other.role !== UserRole.USER,
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
        otherLastReadAt: otherParticipant?.lastReadAt ?? null,
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

    const otherParticipant = c.participants.find(
      (p) => p.user.id !== currentUser.id,
    );
    const other = otherParticipant?.user;
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
        hasPublicProfile: other.role !== UserRole.USER,
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
      otherLastReadAt: otherParticipant?.lastReadAt ?? null,
    };
  }

  async listMessages(
    currentUser: User,
    conversationId: string,
    opts: { limit?: number; before?: string } = {},
  ): Promise<MessageView[]> {
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
    return items.reverse().map((m) => this.toMessageView(m));
  }

  async sendMessage(
    currentUser: User,
    conversationId: string,
    body: string,
    attachmentRef?: AttachmentRef,
  ): Promise<MessageView> {
    const c = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['participants', 'participants.user'],
    });
    if (!c) throw new NotFoundException('Conversación no encontrada');
    this.ensureMember(c, currentUser.id);

    // El @MinLength(1) del DTO valida la cadena CRUDA, así que '   ' (solo
    // espacios) pasa la validación. Rechazamos aquí el contenido vacío tras
    // recortar para no persistir/notificar un mensaje en blanco.
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      throw new BadRequestException('El mensaje no puede estar vacío');
    }

    const attachment = await this.resolveAttachment(attachmentRef);

    const message = this.messageRepo.create({
      conversation: c,
      sender: currentUser,
      body: trimmed,
      attachment,
    });
    const saved = await this.messageRepo.save(message);

    c.lastMessageAt = saved.createdAt;
    await this.conversationRepo.save(c);

    const view = this.toMessageView(saved);
    // Tiempo real: avisa al resto de participantes del nuevo mensaje.
    for (const p of c.participants) {
      if (p.user.id !== currentUser.id) {
        this.gateway.emitMessage(p.user.id, {
          conversationId: c.id,
          message: view,
        });
      }
    }
    return view;
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

    // Tiempo real: avisa a los demás participantes (recibos de lectura).
    const others = await this.participantRepo.find({
      where: { conversation: { id: conversationId } },
    });
    for (const p of others) {
      if (p.user.id !== currentUser.id) {
        this.gateway.emitRead(p.user.id, {
          conversationId,
          readerId: currentUser.id,
        });
      }
    }
  }

  private ensureMember(c: Conversation, userId: string): void {
    const isMember = c.participants.some((p) => p.user.id === userId);
    if (!isMember) {
      throw new ForbiddenException('No tienes acceso a esta conversación');
    }
  }
}
