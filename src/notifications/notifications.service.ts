import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity.js';
import { NotificationType } from './enums/notification-type.enum.js';
import { PrintersService } from '../printers/printers.service.js';

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  data?: Record<string, unknown> | null;
  /** Si se indica y ya existe una notificación con esta clave para el usuario, no se duplica. */
  dedupeKey?: string | null;
}

export interface InboxResult {
  items: Notification[];
  unreadCount: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private static readonly MAX_ITEMS = 50;
  private static readonly MAX_HISTORY = 200;

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly printersService: PrintersService,
  ) {}

  /**
   * Crea una notificación para un usuario. Si `dedupeKey` ya existe para ese
   * usuario, devuelve la existente sin crear un duplicado.
   */
  async create(
    userId: string,
    input: CreateNotificationInput,
  ): Promise<Notification> {
    if (input.dedupeKey) {
      // withDeleted: si ya se notificó este ciclo (aunque se haya archivado),
      // no se vuelve a crear. Así borrar una alerta la descarta para su ciclo
      // y no se acumulan duplicados en el histórico.
      const existing = await this.repo.findOne({
        where: { userId, dedupeKey: input.dedupeKey },
        withDeleted: true,
      });
      if (existing) return existing;
    }

    const notification = this.repo.create({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
      data: input.data ?? null,
      dedupeKey: input.dedupeKey ?? null,
      read: false,
    });
    return this.repo.save(notification);
  }

  /** Bandeja activa: excluye las archivadas (soft-deleted) automáticamente. */
  async findForUser(userId: string): Promise<Notification[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: NotificationsService.MAX_ITEMS,
    });
  }

  /** Histórico permanente: incluye también las archivadas (withDeleted). */
  async findHistory(userId: string): Promise<Notification[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: NotificationsService.MAX_HISTORY,
      withDeleted: true,
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.repo.count({
      where: { userId, read: false },
    });
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.repo.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }
    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await this.repo.save(notification);
    }
    return notification;
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.repo.update(
      { userId, read: false },
      { read: true, readAt: new Date() },
    );
    return { updated: result.affected ?? 0 };
  }

  /** Archiva una notificación (soft-delete): sale de la bandeja, sigue en el histórico. */
  async remove(id: string, userId: string): Promise<{ message: string }> {
    const result = await this.repo.softDelete({ id, userId });
    if (!result.affected) {
      throw new NotFoundException('Notificación no encontrada');
    }
    return { message: 'Notificación archivada' };
  }

  /** Archiva todas las notificaciones activas del usuario (soft-delete masivo). */
  async removeAll(userId: string): Promise<{ archived: number }> {
    const result = await this.repo.softDelete({ userId });
    return { archived: result.affected ?? 0 };
  }

  /**
   * Recalcula el mantenimiento de las impresoras del usuario y crea una
   * notificación por cada mantenimiento pendiente (deduplicada por ciclo).
   * Se invoca al cargar la bandeja, por lo que en Vercel (serverless, sin cron)
   * la notificación aparece al entrar a la app.
   */
  async syncMaintenance(userId: string): Promise<void> {
    let due: Awaited<ReturnType<PrintersService['findMaintenanceDue']>>;
    try {
      due = await this.printersService.findMaintenanceDue(userId);
    } catch (err) {
      this.logger.warn(
        `No se pudo calcular el mantenimiento para ${userId}: ${
          (err as Error)?.message ?? err
        }`,
      );
      return;
    }

    for (const item of due) {
      const cycle = item.lastMaintenanceAt
        ? new Date(item.lastMaintenanceAt).toISOString()
        : 'never';
      const dedupeKey = `maintenance:${item.type}:${item.printerId}:${cycle}`;
      const label = item.type === 'simple' ? 'básico' : 'completo';

      await this.create(userId, {
        type: NotificationType.MAINTENANCE_DUE,
        title: `Mantenimiento ${label} pendiente`,
        body: `Tu impresora «${item.printerName}» ha alcanzado ${item.hoursSince} h de uso (umbral: ${item.threshold} h).`,
        link: `/home/printers/${item.printerId}`,
        data: {
          printerId: item.printerId,
          printerName: item.printerName,
          maintenanceType: item.type,
          hoursSince: item.hoursSince,
          threshold: item.threshold,
        },
        dedupeKey,
      });
    }
  }

  /** Sincroniza el mantenimiento y devuelve la bandeja + contador de no leídas. */
  async getInbox(userId: string): Promise<InboxResult> {
    await this.syncMaintenance(userId);
    const [items, unreadCount] = await Promise.all([
      this.findForUser(userId),
      this.unreadCount(userId),
    ]);
    return { items, unreadCount };
  }
}
