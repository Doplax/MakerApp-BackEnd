import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Filament } from '../filaments/entities/filament.entity.js';
import { Printer } from '../printers/entities/printer.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { PrintLog } from '../print-logs/entities/print-log.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Conversation } from '../chat/entities/conversation.entity.js';
import { ConversationParticipant } from '../chat/entities/conversation-participant.entity.js';
import { Message } from '../chat/entities/message.entity.js';
import { Purchase } from '../purchases/entities/purchase.entity.js';
import { Review } from '../reviews/entities/review.entity.js';
import { MakerReview } from '../maker-reviews/entities/maker-review.entity.js';
import { Follow } from '../follows/entities/follow.entity.js';
import { Notification } from '../notifications/entities/notification.entity.js';
import { PurchaseStatus } from '../purchases/enums/purchase-status.enum.js';
import { NotificationType } from '../notifications/enums/notification-type.enum.js';
import { usersToSeed } from './data/users.seed.js';
import { filamentsToSeed } from './data/filaments.seed.js';
import { printersToSeed } from './data/printers.seed.js';
import { projectsToSeed } from './data/projects.seed.js';
import { printLogsToSeed } from './data/print-logs.seed.js';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Filament)
    private readonly filamentRepository: Repository<Filament>,
    @InjectRepository(Printer)
    private readonly printerRepository: Repository<Printer>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(PrintLog)
    private readonly printLogRepository: Repository<PrintLog>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private readonly participantRepository: Repository<ConversationParticipant>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(MakerReview)
    private readonly makerReviewRepository: Repository<MakerReview>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async executeSeed() {
    // ⚠️⚠️⚠️  OPERACIÓN DESTRUCTIVA — SOLO EN DESARROLLO  ⚠️⚠️⚠️
    // Este seed hace TRUNCATE … CASCADE: BORRA TODOS LOS DATOS (usuarios,
    // filamentos, impresoras, proyectos, pedidos, reseñas, chats…) y los
    // reemplaza por datos sintéticos. Sirve para tener un usuario de demo con
    // el MÁXIMO de datos vinculados (filamentos, proyectos, pedidos, reseñas,
    // seguidores, notificaciones, conversaciones y coordenadas de mapa).
    //
    // Esto SOLO es admisible ahora, mientras la app está EN DESARROLLO y sin
    // datos reales. NUNCA debe ejecutarse contra producción: vaciaría la BD de
    // usuarios reales. Antes de correrlo, confirma que DATABASE_URL apunta a
    // una BD de desarrollo y haz un backup (Back/backup-db.cjs).

    // Guard de seguridad: este seed es DESTRUCTIVO. Se bloquea si DATABASE_URL
    // apunta a una BD remota (Neon/producción). Solo se permite en local, salvo
    // override EXPLÍCITO con SEED_ALLOW_REMOTE=true.
    const dbUrl = process.env.DATABASE_URL ?? '';
    const looksLocal =
      dbUrl === '' ||
      dbUrl.includes('localhost') ||
      dbUrl.includes('127.0.0.1');
    if (!looksLocal && process.env.SEED_ALLOW_REMOTE !== 'true') {
      const host = dbUrl.split('@')[1] ?? dbUrl;
      throw new Error(
        `🛑 Seed BLOQUEADO: DATABASE_URL apunta a una BD remota (${host}). ` +
          'Este seed BORRA toda la base de datos y solo debe ejecutarse en local. ' +
          'Si de verdad quieres sembrar esta BD remota, ejecútalo con SEED_ALLOW_REMOTE=true.',
      );
    }

    // Limpieza robusta con TRUNCATE … CASCADE: vacía también las tablas de
    // unión (project_filaments) y cualquier dependiente por FK, sin depender
    // del orden. (filament_catalog no se toca: es catálogo de referencia.)
    await this.userRepository.manager.query(`
      TRUNCATE TABLE
        messages, conversation_participants, conversations,
        print_logs, project_filaments, projects, filaments, printers,
        reviews, follows, maker_reviews, notifications, purchases,
        users
      CASCADE
    `);

    // Crear usuarios desde seed data
    const savedUsers: User[] = [];
    for (const userData of usersToSeed) {
      const user = this.userRepository.create(userData);
      savedUsers.push(await this.userRepository.save(user));
    }

    // Buscamos el usuario 'doplax' por email, o el primero por defecto
    const doplaxUser =
      savedUsers.find((u) => u.email === 'doplax@gmail.com') || savedUsers[0];

    // Crear filamentos — marcamos isPublic:true para que aparezcan en el
    // perfil público del maker (la entity por defecto los crea privados).
    const savedFilaments: Filament[] = [];
    for (const data of filamentsToSeed) {
      const filament = this.filamentRepository.create({
        ...data,
        isPublic: true,
        createdBy: doplaxUser,
      });
      savedFilaments.push(await this.filamentRepository.save(filament));
    }

    // Crear impresoras
    const savedPrinters: Printer[] = [];
    for (const data of printersToSeed) {
      const printer = this.printerRepository.create({
        ...data,
        createdBy: doplaxUser,
      });
      savedPrinters.push(await this.printerRepository.save(printer));
    }

    // Crear proyectos — públicos para que aparezcan en el perfil del maker.
    const savedProjects: Project[] = [];
    for (const data of projectsToSeed) {
      const project = this.projectRepository.create({
        ...data,
        isPublic: true,
        createdBy: doplaxUser,
      });
      savedProjects.push(await this.projectRepository.save(project));
    }

    // Marca el primer proyecto como destacado del maker.
    // OJO: usar update() y NO save(). La entidad User hashea la contraseña en
    // @BeforeInsert *y* @BeforeUpdate, así que un save() de la entidad volvería
    // a hashear la contraseña (ya hasheada) → doble hash → login roto.
    // update() ejecuta un UPDATE directo sin disparar los hooks de entidad.
    if (savedProjects.length > 0) {
      await this.userRepository.update(doplaxUser.id, {
        featuredProjectId: savedProjects[0].id,
      });
    }

    // Crear registros de impresión
    for (const data of printLogsToSeed) {
      const { filamentIndex, printerIndex, projectIndex, ...logData } = data;
      const printLog = this.printLogRepository.create({
        ...logData,
        filament: savedFilaments[filamentIndex],
        printer: savedPrinters[printerIndex],
        project:
          projectIndex !== undefined ? savedProjects[projectIndex] : undefined,
        createdBy: doplaxUser,
      });
      await this.printLogRepository.save(printLog);
    }

    // ── Chat: conversaciones de ejemplo (para probar el chat en local) ──
    const findUser = (email: string): User | undefined =>
      savedUsers.find((u) => u.email === email);

    const seedConversation = async (
      a: User,
      b: User,
      msgs: { from: 'a' | 'b'; body: string; minutesAgo: number }[],
    ): Promise<Conversation> => {
      const conv = await this.conversationRepository.save(
        this.conversationRepository.create({ lastMessageAt: null }),
      );
      await this.participantRepository.save([
        this.participantRepository.create({
          conversation: conv,
          user: a,
          lastReadAt: new Date(),
        }),
        this.participantRepository.create({
          conversation: conv,
          user: b,
          lastReadAt: null,
        }),
      ]);
      let last: Date | null = null;
      for (const m of msgs) {
        const at = new Date(Date.now() - m.minutesAgo * 60_000);
        await this.messageRepository.save(
          this.messageRepository.create({
            conversation: conv,
            sender: m.from === 'a' ? a : b,
            body: m.body,
            createdAt: at,
          }),
        );
        last = at;
      }
      conv.lastMessageAt = last;
      await this.conversationRepository.save(conv);
      return conv;
    };

    const ana = findUser('ana.maker@example.com');
    const mikel = findUser('mikel.3d@example.com');
    let conversationsCount = 0;
    let anaConv: Conversation | null = null;

    if (ana) {
      anaConv = await seedConversation(doplaxUser, ana, [
        { from: 'b', body: '¡Hola! Vi tu perfil, haces unas piezas geniales 👏', minutesAgo: 180 },
        { from: 'a', body: '¡Gracias Ana! ¿Necesitas algo en concreto?', minutesAgo: 178 },
        { from: 'b', body: 'Sí, busco una pieza funcional en PETG. ¿Me harías un presupuesto?', minutesAgo: 65 },
        { from: 'a', body: 'Claro 😊 Pásame las medidas y te digo precio.', minutesAgo: 60 },
      ]);
      conversationsCount++;
    }

    if (mikel) {
      await seedConversation(doplaxUser, mikel, [
        { from: 'b', body: 'Buenas, ¿tienes filamento ASA en stock?', minutesAgo: 40 },
        { from: 'a', body: 'Ahora mismo no, pero me llega esta semana.', minutesAgo: 35 },
        { from: 'b', body: 'Genial, avísame cuando llegue 🙌', minutesAgo: 34 },
      ]);
      conversationsCount++;
    }

    // ── Datos vinculados para que doplax tenga un perfil de demo "completo" ──
    // pedidos (ventas y compras), reseñas de maker y de proyecto, seguidores y
    // notificaciones. Todo colgado del usuario doplax.
    const others = savedUsers.filter((u) => u.id !== doplaxUser.id);
    const priceCents = (p?: Project): number =>
      p?.price ? Math.round(Number(p.price) * 100) : 1500;

    // Pedidos: ventas de doplax (maker=doplax) a varios compradores, con
    // distintos estados. Guardamos las "succeeded" para colgarles reseñas.
    const succeededSales: Purchase[] = [];
    const saleSpecs: {
      buyerIdx: number;
      projIdx: number;
      status: PurchaseStatus;
    }[] = [
      { buyerIdx: 0, projIdx: 0, status: PurchaseStatus.SUCCEEDED },
      { buyerIdx: 1, projIdx: 1, status: PurchaseStatus.SUCCEEDED },
      { buyerIdx: 2, projIdx: 2, status: PurchaseStatus.SUCCEEDED },
      { buyerIdx: 3, projIdx: 0, status: PurchaseStatus.SUCCEEDED },
      { buyerIdx: 4, projIdx: 3, status: PurchaseStatus.SUCCEEDED },
      { buyerIdx: 5, projIdx: 1, status: PurchaseStatus.PENDING },
      { buyerIdx: 6, projIdx: 2, status: PurchaseStatus.REFUNDED },
    ];
    let purchasesCount = 0;
    for (const s of saleSpecs) {
      const buyer = others[s.buyerIdx % others.length];
      const project = savedProjects[s.projIdx % savedProjects.length];
      if (!buyer || !project) continue;
      const purchase = await this.purchaseRepository.save(
        this.purchaseRepository.create({
          buyer,
          maker: doplaxUser,
          project,
          amount: priceCents(project),
          currency: 'eur',
          status: s.status,
        }),
      );
      purchasesCount++;
      if (s.status === PurchaseStatus.SUCCEEDED) succeededSales.push(purchase);
    }

    // Un par de compras donde doplax es el COMPRADOR (a otros makers).
    for (let i = 0; i < 2 && others[i]; i++) {
      await this.purchaseRepository.save(
        this.purchaseRepository.create({
          buyer: doplaxUser,
          maker: others[i],
          project: null,
          amount: 1200 + i * 800,
          currency: 'eur',
          status: PurchaseStatus.SUCCEEDED,
        }),
      );
      purchasesCount++;
    }

    // Reseñas al maker (doplax) ligadas a ventas completadas → puntuación media.
    const makerComments = [
      'Trabajo impecable y entrega rápida. ¡Repetiré!',
      'Muy buena comunicación y la pieza quedó perfecta.',
      'Calidad top, justo lo que necesitaba.',
      'Profesional y atento. Recomendado 100%.',
    ];
    let makerReviewsCount = 0;
    for (let i = 0; i < succeededSales.length && i < makerComments.length; i++) {
      const purchase = succeededSales[i];
      await this.makerReviewRepository.save(
        this.makerReviewRepository.create({
          author: purchase.buyer as User,
          maker: doplaxUser,
          purchase,
          rating: i % 4 === 0 ? 4 : 5,
          comment: makerComments[i],
        }),
      );
      makerReviewsCount++;
    }

    // Reseñas de proyecto (otros usuarios reseñan los proyectos de doplax).
    const projectComments = [
      'Diseño muy bien pensado, encaja a la perfección.',
      'Fácil de imprimir y resultado robusto.',
      'Justo lo que buscaba para mi proyecto.',
      'Buenas tolerancias y sin soportes. Genial.',
    ];
    let reviewsCount = 0;
    for (let i = 0; i < projectComments.length; i++) {
      const project = savedProjects[i % savedProjects.length];
      const author = others[(i + 2) % others.length];
      if (!project || !author) continue;
      await this.reviewRepository.save(
        this.reviewRepository.create({
          author,
          project,
          rating: 4 + (i % 2),
          comment: projectComments[i],
        }),
      );
      reviewsCount++;
    }

    // Seguidores: varios usuarios siguen a doplax; doplax sigue a algunos.
    let followsCount = 0;
    for (let i = 0; i < Math.min(8, others.length); i++) {
      await this.followRepository.save(
        this.followRepository.create({
          follower: others[i],
          following: doplaxUser,
        }),
      );
      followsCount++;
    }
    for (let i = 0; i < Math.min(3, others.length); i++) {
      await this.followRepository.save(
        this.followRepository.create({
          follower: doplaxUser,
          following: others[i],
        }),
      );
      followsCount++;
    }

    // Notificaciones para doplax (mezcla de leídas y sin leer). Cada una con
    // su `link`: al pulsarla, el front navega al lugar correspondiente.
    const followerForNotif = others[0];
    const projectForNotif = savedProjects[0];
    const printerForNotif = savedPrinters[0];
    const notifs: {
      type: NotificationType;
      title: string;
      body: string;
      read: boolean;
      link: string | null;
    }[] = [
      { type: NotificationType.ORDER_CONFIRMED, title: 'Nueva venta', body: 'Has vendido un proyecto. ¡Enhorabuena!', read: false, link: projectForNotif ? `/home/projects/${projectForNotif.id}` : '/home/finances' },
      { type: NotificationType.REVIEW_RECEIVED, title: 'Nueva reseña', body: 'Un comprador te ha dejado 5 estrellas.', read: false, link: '/home/profile' },
      { type: NotificationType.FOLLOW_RECEIVED, title: 'Nuevo seguidor', body: 'Tienes un nuevo seguidor en tu perfil.', read: false, link: followerForNotif ? `/public/maker/${followerForNotif.id}` : '/home/profile' },
      { type: NotificationType.CHAT_MESSAGE, title: 'Nuevo mensaje', body: 'Tienes un mensaje sin leer en el chat.', read: true, link: anaConv ? `/home/chat/${anaConv.id}` : '/home/chat' },
      { type: NotificationType.MAINTENANCE_DUE, title: 'Mantenimiento de impresora', body: 'Una de tus impresoras necesita revisión de boquilla.', read: true, link: printerForNotif ? `/home/printers/${printerForNotif.id}` : '/home/printers' },
      { type: NotificationType.SYSTEM, title: 'Bienvenido a MakerUp', body: 'Completa tu perfil para aparecer en el mapa de makers.', read: true, link: '/home/profile' },
    ];
    let notificationsCount = 0;
    for (const n of notifs) {
      await this.notificationRepository.save(
        this.notificationRepository.create({
          userId: doplaxUser.id,
          type: n.type,
          title: n.title,
          body: n.body,
          link: n.link,
          read: n.read,
          readAt: n.read ? new Date() : null,
        }),
      );
      notificationsCount++;
    }

    this.logger.log('Seed executed successfully!');
    this.logger.log(
      `Created: ${savedUsers.length} users, ${savedFilaments.length} filaments, ${savedPrinters.length} printers, ${savedProjects.length} projects, ${printLogsToSeed.length} print logs, ${conversationsCount} conversations, ${purchasesCount} purchases, ${makerReviewsCount} maker reviews, ${reviewsCount} project reviews, ${followsCount} follows, ${notificationsCount} notifications`,
    );

    return {
      message: 'Seed executed successfully',
      data: {
        users: savedUsers.length,
        filaments: savedFilaments.length,
        printers: savedPrinters.length,
        projects: savedProjects.length,
        printLogs: printLogsToSeed.length,
        purchases: purchasesCount,
        makerReviews: makerReviewsCount,
        reviews: reviewsCount,
        follows: followsCount,
        notifications: notificationsCount,
      },
      credentials: usersToSeed.map((u) => ({
        email: u.email,
        password: u.password,
        role: u.role,
      })),
    };
  }
}
