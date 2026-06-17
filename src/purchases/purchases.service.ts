import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Purchase } from './entities/purchase.entity.js';
import { PurchaseStatus } from './enums/purchase-status.enum.js';
import { Project } from '../projects/entities/project.entity.js';
import { User } from '../users/entities/user.entity.js';
import { MailService } from '../mail/mail.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../notifications/enums/notification-type.enum.js';

interface RecordPurchaseInput {
  paymentIntentId: string;
  amount: number;
  currency: string;
  projectId?: string;
  buyerId?: string;
  makerId?: string;
}

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    @InjectRepository(Purchase)
    private readonly purchaseRepo: Repository<Purchase>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailService: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Registra (o actualiza) una compra como completada.
   * Llamado desde el webhook de Stripe al confirmar payment_intent.succeeded.
   */
  async recordSucceeded(input: RecordPurchaseInput): Promise<Purchase> {
    const existing = await this.purchaseRepo.findOne({
      where: { paymentIntentId: input.paymentIntentId },
    });
    if (existing) {
      existing.status = PurchaseStatus.SUCCEEDED;
      return this.purchaseRepo.save(existing);
    }

    const project = input.projectId
      ? await this.projectRepo.findOne({
          where: { id: input.projectId },
          relations: ['createdBy'],
        })
      : null;

    const maker = input.makerId
      ? await this.userRepo.findOne({ where: { id: input.makerId } })
      : (project?.createdBy ?? null);

    if (!maker) {
      this.logger.warn(
        `No se pudo determinar el maker para PaymentIntent ${input.paymentIntentId}`,
      );
      throw new NotFoundException('Maker no encontrado para la compra');
    }

    const buyer = input.buyerId
      ? await this.userRepo.findOne({ where: { id: input.buyerId } })
      : null;

    const purchase = this.purchaseRepo.create({
      paymentIntentId: input.paymentIntentId,
      amount: input.amount,
      currency: input.currency,
      project,
      maker,
      buyer,
      status: PurchaseStatus.SUCCEEDED,
    });

    const saved = await this.purchaseRepo.save(purchase);

    // Email de confirmación al comprador — no bloqueante: si falla el SMTP
    // no rompemos el registro de la compra (Stripe ya la ha cobrado).
    if (buyer?.email) {
      // Stripe envía el importe en la unidad mínima (céntimos) → a euros.
      const price = input.amount / 100;
      this.mailService
        .sendOrderConfirmation(
          buyer.email,
          maker.fullName,
          project?.name ?? 'Pedido',
          price,
        )
        .catch((err) => {
          this.logger.warn(
            `No se pudo enviar la confirmación de pedido a ${buyer.email}: ${
              (err as Error)?.message ?? err
            }`,
          );
        });
    }

    // Notifica al maker que ha vendido un proyecto (no bloqueante).
    try {
      const price = input.amount / 100;
      const buyerName = buyer?.fullName ?? 'Un cliente';
      const projectName = project?.name ?? 'tu proyecto';
      await this.notifications.create(maker.id, {
        type: NotificationType.ORDER_CONFIRMED,
        title: 'Nueva venta',
        body: `${buyerName} ha comprado «${projectName}» por ${price} ${input.currency.toUpperCase()}.`,
        link: '/home/finances',
        data: {
          purchaseId: saved.id,
          projectId: project?.id ?? null,
          projectName,
          buyerName,
          amount: price,
          currency: input.currency,
        },
        dedupeKey: `purchase:${saved.id}`,
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo crear la notificación de venta: ${
          (err as Error)?.message ?? err
        }`,
      );
    }

    return saved;
  }

  async findById(id: string): Promise<Purchase | null> {
    return this.purchaseRepo.findOne({
      where: { id },
      relations: ['buyer', 'maker', 'project'],
    });
  }

  /**
   * Comprueba si el comprador tiene al menos una compra completada al maker dado.
   * Usado para validar quién puede dejar reseña.
   */
  async hasSucceededPurchase(buyerId: string, makerId: string): Promise<boolean> {
    const count = await this.purchaseRepo.count({
      where: {
        buyer: { id: buyerId },
        maker: { id: makerId },
        status: PurchaseStatus.SUCCEEDED,
      },
    });
    return count > 0;
  }

  async findSucceededPurchase(
    purchaseId: string,
    buyerId: string,
  ): Promise<Purchase | null> {
    return this.purchaseRepo.findOne({
      where: {
        id: purchaseId,
        status: PurchaseStatus.SUCCEEDED,
        buyer: { id: buyerId },
      },
      relations: ['buyer', 'maker', 'project'],
    });
  }
}
