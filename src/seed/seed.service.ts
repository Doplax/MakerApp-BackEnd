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
  ) {}

  async executeSeed() {
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

    // Crear proyectos
    const savedProjects: Project[] = [];
    for (const data of projectsToSeed) {
      const project = this.projectRepository.create({
        ...data,
        createdBy: doplaxUser,
      });
      savedProjects.push(await this.projectRepository.save(project));
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
    ): Promise<void> => {
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
    };

    const ana = findUser('ana.maker@example.com');
    const mikel = findUser('mikel.3d@example.com');
    let conversationsCount = 0;

    if (ana) {
      await seedConversation(doplaxUser, ana, [
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

    this.logger.log('Seed executed successfully!');
    this.logger.log(
      `Created: ${savedUsers.length} users, ${savedFilaments.length} filaments, ${savedPrinters.length} printers, ${savedProjects.length} projects, ${printLogsToSeed.length} print logs, ${conversationsCount} conversations`,
    );

    return {
      message: 'Seed executed successfully',
      data: {
        users: savedUsers.length,
        filaments: savedFilaments.length,
        printers: savedPrinters.length,
        projects: savedProjects.length,
        printLogs: printLogsToSeed.length,
      },
      credentials: usersToSeed.map((u) => ({
        email: u.email,
        password: u.password,
        role: u.role,
      })),
    };
  }
}
