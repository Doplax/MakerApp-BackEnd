import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MakerReview } from './entities/maker-review.entity.js';
import { Purchase } from '../purchases/entities/purchase.entity.js';
import { PurchaseStatus } from '../purchases/enums/purchase-status.enum.js';
import { User } from '../users/entities/user.entity.js';
import { CreateMakerReviewDto } from './dto/create-maker-review.dto.js';
import { UpdateMakerReviewDto } from './dto/update-maker-review.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../notifications/enums/notification-type.enum.js';

export interface MakerRatingSummary {
  average: number;
  count: number;
}

@Injectable()
export class MakerReviewsService {
  private readonly logger = new Logger(MakerReviewsService.name);

  constructor(
    @InjectRepository(MakerReview)
    private readonly reviewRepo: Repository<MakerReview>,
    @InjectRepository(Purchase)
    private readonly purchaseRepo: Repository<Purchase>,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateMakerReviewDto, author: User): Promise<MakerReview> {
    const purchase = await this.purchaseRepo.findOne({
      where: { id: dto.purchaseId },
      relations: ['buyer', 'maker'],
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada');
    if (purchase.status !== PurchaseStatus.SUCCEEDED)
      throw new BadRequestException(
        'Solo se pueden valorar compras completadas',
      );
    if (!purchase.buyer || purchase.buyer.id !== author.id)
      throw new ForbiddenException('Solo el comprador puede valorar al maker');
    if (purchase.maker.id === author.id)
      throw new BadRequestException('No puedes valorarte a ti mismo');

    const existing = await this.reviewRepo.findOne({
      where: { purchase: { id: purchase.id } },
    });
    if (existing) throw new ConflictException('Ya has valorado esta compra');

    const review = this.reviewRepo.create({
      rating: dto.rating,
      comment: dto.comment ?? null,
      author,
      maker: purchase.maker,
      purchase,
    });
    const saved = await this.reviewRepo.save(review);

    // Notifica al maker que ha recibido una reseña (no bloqueante).
    try {
      const comment = dto.comment?.trim();
      const preview = comment
        ? `: «${comment.length > 80 ? comment.slice(0, 80) + '…' : comment}»`
        : '';
      await this.notifications.create(purchase.maker.id, {
        type: NotificationType.REVIEW_RECEIVED,
        title: 'Nueva reseña',
        body: `${author.fullName} te ha valorado con ${dto.rating}★${preview}`,
        link: `/public/maker/${purchase.maker.id}`,
        data: {
          reviewId: saved.id,
          authorId: author.id,
          authorName: author.fullName,
          rating: dto.rating,
        },
        dedupeKey: `review:${saved.id}`,
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo crear la notificación de reseña: ${
          (err as Error)?.message ?? err
        }`,
      );
    }

    return saved;
  }

  async findByMaker(makerId: string): Promise<MakerReview[]> {
    return this.reviewRepo.find({
      where: { maker: { id: makerId } },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });
  }

  async getMakerRatingSummary(makerId: string): Promise<MakerRatingSummary> {
    const row = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.makerId = :makerId', { makerId })
      .getRawOne<{ avg: string | null; count: string }>();

    const average = row?.avg ? parseFloat(parseFloat(row.avg).toFixed(2)) : 0;
    const count = row?.count ? parseInt(row.count, 10) : 0;
    return { average, count };
  }

  async update(
    id: string,
    dto: UpdateMakerReviewDto,
    author: User,
  ): Promise<MakerReview> {
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: ['author'],
    });
    if (!review) throw new NotFoundException('Reseña no encontrada');
    if (review.author.id !== author.id)
      throw new ForbiddenException('No puedes editar esta reseña');

    Object.assign(review, dto);
    return this.reviewRepo.save(review);
  }

  async remove(id: string, author: User): Promise<{ message: string }> {
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: ['author'],
    });
    if (!review) throw new NotFoundException('Reseña no encontrada');
    if (review.author.id !== author.id)
      throw new ForbiddenException('No puedes eliminar esta reseña');
    await this.reviewRepo.remove(review);
    return { message: 'Reseña eliminada' };
  }
}
