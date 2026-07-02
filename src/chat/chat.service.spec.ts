import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { Conversation } from './entities/conversation.entity.js';
import { User } from './../users/entities/user.entity.js';

/**
 * El chat es el canal comercial comprador↔maker: la autorización (solo los
 * participantes pueden leer/escribir) y la integridad del emisor son críticas.
 * Estos tests fijan ese comportamiento con mocks de los repos y el gateway.
 */
describe('ChatService', () => {
  let conversationRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let participantRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let messageRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let userRepo: { findOne: jest.Mock };
  let gateway: { emitMessage: jest.Mock; emitRead: jest.Mock };
  let service: ChatService;

  /** Fabrica un usuario mínimo válido para el servicio. */
  const makeUser = (over: Partial<User> = {}): User =>
    ({
      id: 'u1',
      fullName: 'User One',
      avatarUrl: null,
      isActive: true,
      ...over,
    }) as unknown as User;

  /** QueryBuilder encadenable que resuelve `getOne()` con lo indicado. */
  const makeQb = (result: unknown) => {
    const qb = {
      innerJoin: jest.fn(() => qb),
      where: jest.fn(() => qb),
      andWhere: jest.fn(() => qb),
      getOne: jest.fn(async () => result),
    };
    return qb;
  };

  beforeEach(() => {
    conversationRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((x: unknown) => x),
      save: jest.fn(async (x: Record<string, unknown>) => ({ id: 'c1', ...x })),
      createQueryBuilder: jest.fn(),
    };
    participantRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((x: unknown) => x),
      save: jest.fn(async (x: unknown) => x),
    };
    messageRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((x: unknown) => x),
      save: jest.fn(async (x: Record<string, unknown>) => ({
        id: 'm1',
        createdAt: new Date('2026-07-02T10:00:00Z'),
        ...x,
      })),
      createQueryBuilder: jest.fn(),
    };
    userRepo = { findOne: jest.fn() };
    gateway = { emitMessage: jest.fn(), emitRead: jest.fn() };

    service = new ChatService(
      conversationRepo as never,
      participantRepo as never,
      messageRepo as never,
      userRepo as never,
      gateway as never,
    );
  });

  // ── startOrGetDirectConversation ───────────────────────────────────────
  describe('startOrGetDirectConversation', () => {
    it('es idempotente: si ya existe la conversación 1:1 la devuelve y NO crea otra', async () => {
      const me = makeUser({ id: 'me' });
      userRepo.findOne.mockResolvedValue(makeUser({ id: 'other' }));
      const existing = { id: 'existing-conv' } as Conversation;
      conversationRepo.createQueryBuilder.mockReturnValue(makeQb(existing));

      const result = await service.startOrGetDirectConversation(me, 'other');

      expect(result).toBe(existing);
      expect(conversationRepo.create).not.toHaveBeenCalled();
      expect(conversationRepo.save).not.toHaveBeenCalled();
      expect(participantRepo.save).not.toHaveBeenCalled();
    });

    it('crea la conversación (con ambos participantes) cuando no existe', async () => {
      const me = makeUser({ id: 'me' });
      const other = makeUser({ id: 'other' });
      userRepo.findOne.mockResolvedValue(other);
      conversationRepo.createQueryBuilder.mockReturnValue(makeQb(null));

      await service.startOrGetDirectConversation(me, 'other');

      expect(conversationRepo.save).toHaveBeenCalledTimes(1);
      // Se persisten exactamente los dos participantes (yo + el otro).
      expect(participantRepo.save).toHaveBeenCalledTimes(1);
      const savedParticipants = participantRepo.save.mock.calls[0][0] as Array<{
        user: User;
      }>;
      expect(savedParticipants).toHaveLength(2);
      expect(savedParticipants.map((p) => p.user.id).sort()).toEqual([
        'me',
        'other',
      ]);
    });

    it('lanza BadRequestException al iniciar una conversación consigo mismo', async () => {
      const me = makeUser({ id: 'me' });
      await expect(
        service.startOrGetDirectConversation(me, 'me'),
      ).rejects.toBeInstanceOf(BadRequestException);
      // No debe ni consultar al usuario ni tocar la BD.
      expect(userRepo.findOne).not.toHaveBeenCalled();
      expect(conversationRepo.save).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el otro usuario no existe', async () => {
      const me = makeUser({ id: 'me' });
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.startOrGetDirectConversation(me, 'ghost'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(conversationRepo.save).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el otro usuario está inactivo (no disponible)', async () => {
      const me = makeUser({ id: 'me' });
      userRepo.findOne.mockResolvedValue(
        makeUser({ id: 'banned', isActive: false }),
      );
      await expect(
        service.startOrGetDirectConversation(me, 'banned'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(conversationRepo.save).not.toHaveBeenCalled();
      expect(participantRepo.save).not.toHaveBeenCalled();
    });
  });

  // ── Autorización: solo los participantes acceden ───────────────────────
  describe('autorización (ensureMember)', () => {
    /** Conversación cuyos participantes son 'a' y 'b' (el intruso será 'x'). */
    const convWithMembers = (): Conversation =>
      ({
        id: 'c1',
        participants: [
          { user: makeUser({ id: 'a' }) },
          { user: makeUser({ id: 'b' }) },
        ],
        lastMessageAt: null,
        updatedAt: new Date(),
      }) as unknown as Conversation;

    it('getConversation: un NO-participante recibe ForbiddenException', async () => {
      conversationRepo.findOne.mockResolvedValue(convWithMembers());
      await expect(
        service.getConversation(makeUser({ id: 'x' }), 'c1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('listMessages: un NO-participante recibe ForbiddenException', async () => {
      conversationRepo.findOne.mockResolvedValue(convWithMembers());
      await expect(
        service.listMessages(makeUser({ id: 'x' }), 'c1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(messageRepo.find).not.toHaveBeenCalled();
    });

    it('sendMessage: un NO-participante recibe ForbiddenException y NO persiste', async () => {
      conversationRepo.findOne.mockResolvedValue(convWithMembers());
      await expect(
        service.sendMessage(makeUser({ id: 'x' }), 'c1', 'hola'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(messageRepo.save).not.toHaveBeenCalled();
      expect(gateway.emitMessage).not.toHaveBeenCalled();
    });
  });

  // ── sendMessage: emisor e integridad del contenido ─────────────────────
  describe('sendMessage', () => {
    const sender = makeUser({ id: 'a', fullName: 'Alice' });
    const conv = (): Conversation =>
      ({
        id: 'c1',
        participants: [{ user: sender }, { user: makeUser({ id: 'b' }) }],
        lastMessageAt: null,
        updatedAt: new Date(),
      }) as unknown as Conversation;

    it('fija el sender = usuario autenticado (no se puede suplantar el emisor)', async () => {
      conversationRepo.findOne.mockResolvedValue(conv());

      const view = await service.sendMessage(sender, 'c1', 'hola');

      // El mensaje persistido lleva SIEMPRE al usuario autenticado como sender.
      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sender, body: 'hola' }),
      );
      expect(view.sender.id).toBe('a');
      expect(view.body).toBe('hola');
      // Notifica al OTRO participante (b), nunca a sí mismo.
      expect(gateway.emitMessage).toHaveBeenCalledTimes(1);
      expect(gateway.emitMessage).toHaveBeenCalledWith(
        'b',
        expect.objectContaining({ conversationId: 'c1' }),
      );
    });

    it('recorta el cuerpo antes de persistir', async () => {
      conversationRepo.findOne.mockResolvedValue(conv());
      await service.sendMessage(sender, 'c1', '  hola  ');
      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ body: 'hola' }),
      );
    });

    it('rechaza un cuerpo vacío con BadRequestException y NO persiste ni notifica', async () => {
      conversationRepo.findOne.mockResolvedValue(conv());
      await expect(
        service.sendMessage(sender, 'c1', ''),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(messageRepo.save).not.toHaveBeenCalled();
      expect(gateway.emitMessage).not.toHaveBeenCalled();
    });

    it('rechaza un cuerpo de solo espacios con BadRequestException y NO persiste ni notifica', async () => {
      conversationRepo.findOne.mockResolvedValue(conv());
      await expect(
        service.sendMessage(sender, 'c1', '     '),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(messageRepo.save).not.toHaveBeenCalled();
      expect(gateway.emitMessage).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si la conversación no existe', async () => {
      conversationRepo.findOne.mockResolvedValue(null);
      await expect(
        service.sendMessage(sender, 'nope', 'hola'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(messageRepo.save).not.toHaveBeenCalled();
    });
  });
});
