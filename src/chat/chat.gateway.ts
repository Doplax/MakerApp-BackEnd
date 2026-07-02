/**
 * Gateway de WebSockets del chat (Socket.IO, namespace `/chat`).
 *
 * El handshake se autentica con el mismo JWT del REST: el cliente lo envía en
 * `auth.token`. Cada usuario se une a una sala `user:<id>`, así emitir a un
 * usuario es emitir a su sala (soporta varias pestañas/dispositivos).
 *
 * Eventos:
 *  - `chat:message`  → al/los destinatario(s)         { conversationId, message }
 *  - `chat:read`     → al otro participante            { conversationId, readerId }
 *  - `chat:typing`   ← del cliente, se reenvía al otro { conversationId, userId }
 */
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { User } from '../users/entities/user.entity.js';
import { ConversationParticipant } from './entities/conversation-participant.entity.js';

interface JwtPayload {
  sub: string;
}

/** Estado de rate limiting por socket (ventana deslizante simple). */
interface RateState {
  count: number;
  start: number;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : '*',
  },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);
  /** Máximo de eventos entrantes por socket en la ventana. */
  private static readonly EVENT_LIMIT = 30;
  private static readonly EVENT_WINDOW_MS = 10_000;

  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ConversationParticipant)
    private readonly participantRepo: Repository<ConversationParticipant>,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      // No basta con un JWT válido: revalidamos que el usuario existe y sigue
      // ACTIVO (pudo ser desactivado/baneado tras emitir el token).
      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
        select: ['id', 'isActive'],
      });
      if (!user || !user.isActive) {
        client.disconnect(true);
        return;
      }
      (client.data as { userId?: string }).userId = user.id;
      client.join(this.room(user.id));
    } catch {
      client.disconnect(true);
    }
  }

  /** Mensaje nuevo → sala del destinatario. */
  emitMessage(recipientUserId: string, payload: unknown): void {
    this.server.to(this.room(recipientUserId)).emit('chat:message', payload);
  }

  /** Lectura → sala del otro participante (para recibos de lectura). */
  emitRead(recipientUserId: string, payload: unknown): void {
    this.server.to(this.room(recipientUserId)).emit('chat:read', payload);
  }

  /**
   * "Escribiendo…". No confiamos en un `toUserId` del cliente: verificamos que el
   * emisor pertenece a la conversación y DERIVAMOS el destinatario (el otro
   * participante). Con rate limiting para evitar flooding.
   */
  @SubscribeMessage('chat:typing')
  async onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ): Promise<void> {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId || !data?.conversationId) return;
    if (!this.allowEvent(client)) return;

    const participants = await this.participantRepo.find({
      where: { conversation: { id: data.conversationId } },
      relations: ['user'],
    });
    const isMember = participants.some((p) => p.user?.id === userId);
    if (!isMember) return; // el emisor no pertenece a la conversación
    const other = participants.find((p) => p.user?.id !== userId);
    if (!other?.user) return;

    this.server.to(this.room(other.user.id)).emit('chat:typing', {
      conversationId: data.conversationId,
      userId,
    });
  }

  /** Rate limit por socket: ignora eventos que superen el límite en la ventana. */
  private allowEvent(client: Socket): boolean {
    const now = Date.now();
    const data = client.data as { rate?: RateState };
    const state = data.rate ?? { count: 0, start: now };
    if (now - state.start > ChatGateway.EVENT_WINDOW_MS) {
      state.count = 0;
      state.start = now;
    }
    state.count += 1;
    data.rate = state;
    return state.count <= ChatGateway.EVENT_LIMIT;
  }

  private room(userId: string): string {
    return `user:${userId}`;
  }

  private extractToken(client: Socket): string {
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token) return auth.token;
    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    const q = client.handshake.query?.token;
    return typeof q === 'string' ? q : '';
  }
}
