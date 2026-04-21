import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async create(dto: CreateReviewDto, author: User): Promise<Review> {
    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId },
      relations: ['createdBy'],
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    if (!project.isPublic)
      throw new ForbiddenException('Solo se pueden reseñar proyectos públicos');
    if (project.createdBy.id === author.id)
      throw new BadRequestException('No puedes reseñar tu propio proyecto');

    const existing = await this.reviewRepo.findOne({
      where: { project: { id: dto.projectId }, author: { id: author.id } },
    });
    if (existing) throw new ConflictException('Ya has reseñado este proyecto');

    const review = this.reviewRepo.create({
      rating: dto.rating,
      comment: dto.comment ?? null,
      author,
      project,
    });
    return this.reviewRepo.save(review);
  }

  async findByProject(projectId: string): Promise<Review[]> {
    return this.reviewRepo.find({
      where: { project: { id: projectId } },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    dto: UpdateReviewDto,
    author: User,
  ): Promise<Review> {
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

  async averageRating(projectId: string): Promise<number> {
    const row = await this.reviewRepo
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .where('review.projectId = :projectId', { projectId })
      .getRawOne<{ avg: string | null }>();
    return row?.avg ? parseFloat(row.avg) : 0;
  }
}
