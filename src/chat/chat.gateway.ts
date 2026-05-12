/**
 * Esqueleto del gateway de WebSockets para chat.
 *
 * Actualmente NO está registrado en `ChatModule` porque la infra de despliegue
 * (Vercel serverless) no admite conexiones persistentes. Cuando se mueva a un
 * runtime que sí lo soporte (Fly, Render, contenedor propio, etc.):
 *
 * 1. Instalar deps:
 *      npm i @nestjs/websockets @nestjs/platform-socket.io socket.io
 *
 * 2. Añadir `ChatGateway` a `providers` en `chat.module.ts`.
 *
 * 3. En `chat.service.ts`, tras `sendMessage` y `markAsRead`, emitir eventos
 *    al gateway (inyectarlo o emitir un evento interno).
 *
 * 4. En el frontend, sustituir el polling por suscripción a `socket.io-client`
 *    en `ChatService` (manteniendo el resto de la API igual).
 *
 * Eventos previstos:
 *  - `chat:message`    payload: Message          → al receptor
 *  - `chat:read`       payload: { conversationId, userId } → al otro participante
 *  - `chat:typing`     payload: { conversationId, userId } → al otro participante
 */

import { Logger } from '@nestjs/common';

// Cuando se active, esto pasa a:
//
// import { WebSocketGateway, WebSocketServer, OnGatewayConnection,
//   OnGatewayDisconnect } from '@nestjs/websockets';
// import { Server, Socket } from 'socket.io';
//
// @WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
// export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect { ... }

export class ChatGateway {
  private readonly logger = new Logger(ChatGateway.name);

  emitMessage(_recipientUserId: string, _payload: unknown): void {
    // no-op hasta que se active el gateway real
  }

  emitRead(_recipientUserId: string, _payload: unknown): void {
    // no-op
  }
}
