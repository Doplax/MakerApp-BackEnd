import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ProjectFavorite } from './entities/project-favorite.entity.js';
import { FavoriteList } from './entities/favorite-list.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { User } from '../users/entities/user.entity.js';

export interface FavoriteListSummary {
  id: string;
  name: string;
  count: number;
}

export interface FavoriteItem {
  id: string;
  listId: string | null;
  createdAt: Date;
  project: {
    id: string;
    name: string;
    imageUrl: string | null;
    price: number | null;
    estimatedTime: number | null;
    estimatedWeight: number | null;
    isPublic: boolean;
    maker: { id: string; fullName: string; avatarUrl: string | null } | null;
  };
}

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(ProjectFavorite)
    private readonly favRepo: Repository<ProjectFavorite>,
    @InjectRepository(FavoriteList)
    private readonly listRepo: Repository<FavoriteList>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  // ── Favoritos ────────────────────────────────────────────────
  async add(
    userId: string,
    projectId: string,
    listId?: string,
  ): Promise<{ message: string }> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['createdBy'],
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    if (project.createdBy?.id === userId) {
      throw new BadRequestException('No puedes guardar tu propio proyecto');
    }

    if (listId) await this.assertOwnedList(userId, listId);

    const existing = await this.favRepo.findOne({
      where: { user: { id: userId }, project: { id: projectId } },
    });
    if (existing) {
      if (listId !== undefined) {
        existing.list = listId ? ({ id: listId } as FavoriteList) : null;
        await this.favRepo.save(existing);
      }
      return { message: 'Ya estaba en favoritos' };
    }

    const fav = this.favRepo.create({
      user: { id: userId } as User,
      project: { id: projectId } as Project,
      list: listId ? ({ id: listId } as FavoriteList) : null,
    });
    await this.favRepo.save(fav);
    return { message: 'Añadido a favoritos' };
  }

  async remove(userId: string, projectId: string): Promise<{ message: string }> {
    const result = await this.favRepo.delete({
      user: { id: userId },
      project: { id: projectId },
    });
    if (result.affected === 0) {
      throw new NotFoundException('No estaba en favoritos');
    }
    return { message: 'Quitado de favoritos' };
  }

  async isFavorited(userId: string, projectId: string): Promise<boolean> {
    const count = await this.favRepo.count({
      where: { user: { id: userId }, project: { id: projectId } },
    });
    return count > 0;
  }

  async getMyFavorites(userId: string): Promise<FavoriteItem[]> {
    const favs = await this.favRepo.find({
      where: { user: { id: userId } },
      relations: ['project', 'project.createdBy', 'list'],
      order: { createdAt: 'DESC' },
    });

    return favs
      .filter((f) => !!f.project)
      .map((f) => ({
        id: f.id,
        listId: f.list?.id ?? null,
        createdAt: f.createdAt,
        project: {
          id: f.project.id,
          name: f.project.name,
          imageUrl: f.project.imageUrl ?? null,
          price: f.project.price ?? null,
          estimatedTime: f.project.estimatedTime ?? null,
          estimatedWeight: f.project.estimatedWeight ?? null,
          isPublic: f.project.isPublic,
          maker: f.project.createdBy
            ? {
                id: f.project.createdBy.id,
                fullName: f.project.createdBy.fullName,
                avatarUrl: f.project.createdBy.avatarUrl ?? null,
              }
            : null,
        },
      }));
  }

  async setList(
    userId: string,
    projectId: string,
    listId: string | null,
  ): Promise<{ message: string }> {
    const fav = await this.favRepo.findOne({
      where: { user: { id: userId }, project: { id: projectId } },
    });
    if (!fav) throw new NotFoundException('No estaba en favoritos');

    if (listId) await this.assertOwnedList(userId, listId);

    fav.list = listId ? ({ id: listId } as FavoriteList) : null;
    await this.favRepo.save(fav);
    return { message: 'Lista actualizada' };
  }

  // ── Listas ───────────────────────────────────────────────────
  async getLists(userId: string): Promise<FavoriteListSummary[]> {
    const lists = await this.listRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });

    const counts = await this.favRepo
      .createQueryBuilder('f')
      .select('f.listId', 'listId')
      .addSelect('COUNT(*)', 'count')
      .where('f.userId = :userId', { userId })
      .andWhere('f.listId IS NOT NULL')
      .groupBy('f.listId')
      .getRawMany<{ listId: string; count: string }>();

    const map = new Map(counts.map((c) => [c.listId, parseInt(c.count, 10)]));
    return lists.map((l) => ({ id: l.id, name: l.name, count: map.get(l.id) ?? 0 }));
  }

  async createList(userId: string, name: string): Promise<FavoriteListSummary> {
    const list = this.listRepo.create({ name, user: { id: userId } as User });
    const saved = await this.listRepo.save(list);
    return { id: saved.id, name: saved.name, count: 0 };
  }

  async renameList(
    userId: string,
    listId: string,
    name: string,
  ): Promise<{ message: string }> {
    const list = await this.assertOwnedList(userId, listId);
    list.name = name;
    await this.listRepo.save(list);
    return { message: 'Lista renombrada' };
  }

  async deleteList(userId: string, listId: string): Promise<{ message: string }> {
    await this.assertOwnedList(userId, listId);
    // Los favoritos de la lista quedan con list = null (FK onDelete SET NULL).
    await this.listRepo.delete({ id: listId });
    return { message: 'Lista eliminada' };
  }

  /** Cuenta de favoritos sin lista (para el grupo "Sin lista"). */
  async getUnlistedCount(userId: string): Promise<number> {
    return this.favRepo.count({
      where: { user: { id: userId }, list: IsNull() },
    });
  }

  private async assertOwnedList(
    userId: string,
    listId: string,
  ): Promise<FavoriteList> {
    const list = await this.listRepo.findOne({
      where: { id: listId, user: { id: userId } },
    });
    if (!list) throw new NotFoundException('Lista no encontrada');
    return list;
  }
}
