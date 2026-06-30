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
import { Server, Socket } from 'socket.io';

interface JwtPayload {
  sub: string;
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

  constructor(private readonly jwt: JwtService) {}

  handleConnection(client: Socket): void {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      (client.data as { userId?: string }).userId = payload.sub;
      client.join(this.room(payload.sub));
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

  /** "Escribiendo…" — el cliente indica a qué usuario avisar; lo reenviamos. */
  @SubscribeMessage('chat:typing')
  onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; toUserId: string },
  ): void {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId || !data?.toUserId) return;
    this.server.to(this.room(data.toUserId)).emit('chat:typing', {
      conversationId: data.conversationId,
      userId,
    });
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
