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
  let projectRepo: { findOne: jest.Mock };
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
    projectRepo = { findOne: jest.fn() };
    gateway = { emitMessage: jest.fn(), emitRead: jest.fn() };

    service = new ChatService(
      conversationRepo as never,
      participantRepo as never,
      messageRepo as never,
      userRepo as never,
      projectRepo as never,
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
      // Notifica por WS a AMBOS participantes: al destinatario (b) y al propio
      // emisor (a), para sincronizar sus otras sesiones (móvil + escritorio).
      // La pestaña que envió deduplica por id, así que no se duplica.
      expect(gateway.emitMessage).toHaveBeenCalledTimes(2);
      expect(gateway.emitMessage).toHaveBeenCalledWith(
        'b',
        expect.objectContaining({ conversationId: 'c1' }),
      );
      expect(gateway.emitMessage).toHaveBeenCalledWith(
        'a',
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

    it('sin adjunto: persiste y devuelve attachment null', async () => {
      conversationRepo.findOne.mockResolvedValue(conv());
      const view = await service.sendMessage(sender, 'c1', 'hola');
      expect(view.attachment).toBeNull();
      expect(projectRepo.findOne).not.toHaveBeenCalled();
    });
  });

  // ── sendMessage: adjunto de proyecto (snapshot DERIVADO en servidor) ────
  describe('sendMessage con adjunto de proyecto', () => {
    const sender = makeUser({ id: 'a', fullName: 'Alice' });
    const conv = (): Conversation =>
      ({
        id: 'c1',
        participants: [{ user: sender }, { user: makeUser({ id: 'b' }) }],
        lastMessageAt: null,
        updatedAt: new Date(),
      }) as unknown as Conversation;

    /** Proyecto público con maker 'b'; el precio llega como string (decimal pg). */
    const publicProject = (over: Record<string, unknown> = {}) => ({
      id: 'p1',
      name: 'Pomo de palanca',
      imageUrl: 'https://cdn/uploads/projects/p1.png',
      price: '14.50',
      isPublic: true,
      createdBy: { id: 'b' },
      ...over,
    });

    it('DERIVA el snapshot del proyecto real (ignora datos del cliente) y lo persiste', async () => {
      conversationRepo.findOne.mockResolvedValue(conv());
      projectRepo.findOne.mockResolvedValue(publicProject());

      const view = await service.sendMessage(sender, 'c1', 'hola', {
        type: 'project',
        projectId: 'p1',
      });

      expect(projectRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'p1' } }),
      );
      // El snapshot se construye desde la BD: nombre/imagen/maker + precio numérico.
      expect(view.attachment).toEqual({
        type: 'project',
        projectId: 'p1',
        makerId: 'b',
        name: 'Pomo de palanca',
        imageUrl: 'https://cdn/uploads/projects/p1.png',
        price: 14.5,
      });
      // Se persiste con el adjunto y se notifica al otro con el mensaje (con adjunto).
      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          attachment: expect.objectContaining({ projectId: 'p1', makerId: 'b' }),
        }),
      );
      expect(gateway.emitMessage).toHaveBeenCalledWith(
        'b',
        expect.objectContaining({
          message: expect.objectContaining({
            attachment: expect.objectContaining({ projectId: 'p1' }),
          }),
        }),
      );
    });

    it('NO adjunta un proyecto privado (attachment null, pero el mensaje se envía)', async () => {
      conversationRepo.findOne.mockResolvedValue(conv());
      projectRepo.findOne.mockResolvedValue(publicProject({ isPublic: false }));

      const view = await service.sendMessage(sender, 'c1', 'hola', {
        type: 'project',
        projectId: 'p1',
      });

      expect(view.attachment).toBeNull();
      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ attachment: null, body: 'hola' }),
      );
    });

    it('NO adjunta un proyecto inexistente (attachment null)', async () => {
      conversationRepo.findOne.mockResolvedValue(conv());
      projectRepo.findOne.mockResolvedValue(null);

      const view = await service.sendMessage(sender, 'c1', 'hola', {
        type: 'project',
        projectId: 'ghost',
      });

      expect(view.attachment).toBeNull();
    });
  });

  // ── listForUser: "pendiente de presupuestar" ───────────────────────────
  //
  // El formulario guiado de presupuesto manda un mensaje con adjunto
  // `type:'project'`. Si el maker aún no ha contestado, esa conversación está
  // PENDIENTE DE PRESUPUESTAR (chip del listado del chat). La derivación se
  // hace en UNA consulta agregada para todas las conversaciones (no N+1).
  describe('listForUser · pendingQuote', () => {
    const me = makeUser({ id: 'maker', fullName: 'Maker' });

    /** Devuelve el mock de un participante-membresía del usuario actual. */
    const membership = (convId: string) => ({
      conversation: { id: convId },
      lastReadAt: null,
    });

    /** Conversación 1:1 entre el usuario actual y `otherId`. */
    const conversation = (id: string, otherId: string) => ({
      id,
      participants: [
        { user: me, lastReadAt: null },
        { user: makeUser({ id: otherId, fullName: `User ${otherId}` }), lastReadAt: null },
      ],
      lastMessageAt: new Date('2026-07-20T10:00:00Z'),
      updatedAt: new Date('2026-07-20T10:00:00Z'),
    });

    /**
     * Prepara los mocks del listado. `rows` son las filas crudas que devuelve
     * la consulta agregada de peticiones de presupuesto.
     */
    function primeList(
      convs: ReturnType<typeof conversation>[],
      rows: {
        cid: string;
        lastquote: string | null;
        lastmine: string | null;
      }[],
    ): { getRawMany: jest.Mock; createQueryBuilderCalls: () => number } {
      participantRepo.find.mockResolvedValue(convs.map((c) => membership(c.id)));
      conversationRepo.find.mockResolvedValue(convs);
      messageRepo.findOne.mockResolvedValue(null); // último mensaje: irrelevante aquí

      const getRawMany = jest.fn(async () => rows);
      const qb = {
        select: jest.fn(() => qb),
        addSelect: jest.fn(() => qb),
        where: jest.fn(() => qb),
        andWhere: jest.fn(() => qb),
        setParameter: jest.fn(() => qb),
        groupBy: jest.fn(() => qb),
        getRawMany,
        getCount: jest.fn(async () => 0), // el de no-leídos
      };
      messageRepo.createQueryBuilder.mockReturnValue(qb);
      return {
        getRawMany,
        createQueryBuilderCalls: () =>
          messageRepo.createQueryBuilder.mock.calls.length,
      };
    }

    it('petición de presupuesto SIN responder → pendingQuote true', async () => {
      primeList(
        [conversation('c1', 'buyer')],
        [{ cid: 'c1', lastquote: '2026-07-20T10:00:00Z', lastmine: null }],
      );

      const [summary] = await service.listForUser(me);

      expect(summary.id).toBe('c1');
      expect(summary.pendingQuote).toBe(true);
    });

    it('si el maker responde DESPUÉS de la petición → pendingQuote false', async () => {
      primeList(
        [conversation('c1', 'buyer')],
        [
          {
            cid: 'c1',
            lastquote: '2026-07-20T10:00:00Z',
            lastmine: '2026-07-20T10:05:00Z', // respuesta posterior
          },
        ],
      );

      const [summary] = await service.listForUser(me);

      expect(summary.pendingQuote).toBe(false);
    });

    it('mi respuesta ANTERIOR a la petición no cuenta → sigue pendingQuote true', async () => {
      primeList(
        [conversation('c1', 'buyer')],
        [
          {
            cid: 'c1',
            lastquote: '2026-07-20T10:00:00Z',
            lastmine: '2026-07-19T09:00:00Z', // hablamos antes de que pidiera
          },
        ],
      );

      const [summary] = await service.listForUser(me);

      expect(summary.pendingQuote).toBe(true);
    });

    it('conversación SIN petición de presupuesto → pendingQuote false', async () => {
      primeList(
        [conversation('c1', 'buyer')],
        [{ cid: 'c1', lastquote: null, lastmine: '2026-07-20T10:05:00Z' }],
      );

      const [summary] = await service.listForUser(me);

      expect(summary.pendingQuote).toBe(false);
    });

    it('marca solo las pendientes y usa UNA sola consulta agregada para todas (sin N+1)', async () => {
      const probe = primeList(
        [
          conversation('c1', 'buyer1'), // pide y no respondo → pendiente
          conversation('c2', 'buyer2'), // pide y respondo → no pendiente
          conversation('c3', 'buyer3'), // sin petición → no pendiente
        ],
        [
          { cid: 'c1', lastquote: '2026-07-20T10:00:00Z', lastmine: null },
          {
            cid: 'c2',
            lastquote: '2026-07-20T10:00:00Z',
            lastmine: '2026-07-20T11:00:00Z',
          },
          { cid: 'c3', lastquote: null, lastmine: null },
        ],
      );

      const summaries = await service.listForUser(me);

      expect(summaries.map((s) => [s.id, s.pendingQuote])).toEqual([
        ['c1', true],
        ['c2', false],
        ['c3', false],
      ]);
      // La agregada se ejecuta UNA vez para las 3 conversaciones…
      expect(probe.getRawMany).toHaveBeenCalledTimes(1);
      // …y el total de query builders creados es 1 (agregada) + 3 (no leídos):
      // la marca de presupuesto NO añade una consulta por conversación.
      expect(probe.createQueryBuilderCalls()).toBe(4);
    });

    it('sin conversaciones no lanza la consulta agregada', async () => {
      participantRepo.find.mockResolvedValue([]);

      const summaries = await service.listForUser(me);

      expect(summaries).toEqual([]);
      expect(messageRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
