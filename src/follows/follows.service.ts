import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow } from './entities/follow.entity.js';
import { User } from '../users/entities/user.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../notifications/enums/notification-type.enum.js';

@Injectable()
export class FollowsService {
  private readonly logger = new Logger(FollowsService.name);

  constructor(
    @InjectRepository(Follow)
    private readonly followRepo: Repository<Follow>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notifications: NotificationsService,
  ) {}

  async follow(
    followerId: string,
    followingId: string,
  ): Promise<{ message: string }> {
    if (followerId === followingId) {
      throw new BadRequestException('No puedes seguirte a ti mismo');
    }

    const target = await this.userRepo.findOne({ where: { id: followingId } });
    if (!target) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const existing = await this.followRepo.findOne({
      where: {
        follower: { id: followerId },
        following: { id: followingId },
      },
    });

    if (existing) {
      return { message: 'Ya sigues a este maker' };
    }

    const follow = this.followRepo.create({
      follower: { id: followerId } as User,
      following: { id: followingId } as User,
    });

    await this.followRepo.save(follow);

    // Notifica al maker que tiene un nuevo seguidor (no bloqueante).
    try {
      const follower = await this.userRepo.findOne({
        where: { id: followerId },
      });
      const name = follower?.fullName ?? 'Alguien';
      await this.notifications.create(followingId, {
        type: NotificationType.FOLLOW_RECEIVED,
        title: 'Tienes un nuevo seguidor',
        body: `${name} ha empezado a seguirte.`,
        link: `/public/maker/${followerId}`,
        data: { followerId, followerName: name },
        dedupeKey: `follow:${followerId}:${followingId}`,
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo crear la notificación de seguidor: ${
          (err as Error)?.message ?? err
        }`,
      );
    }

    return { message: 'Ahora sigues a este maker' };
  }

  async unfollow(
    followerId: string,
    followingId: string,
  ): Promise<{ message: string }> {
    const result = await this.followRepo.delete({
      follower: { id: followerId },
      following: { id: followingId },
    });

    if (result.affected === 0) {
      throw new NotFoundException('No sigues a este maker');
    }

    return { message: 'Has dejado de seguir a este maker' };
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const count = await this.followRepo.count({
      where: {
        follower: { id: followerId },
        following: { id: followingId },
      },
    });
    return count > 0;
  }

  async getFollowing(
    userId: string,
  ): Promise<
    {
      id: string;
      fullName: string;
      avatarUrl: string | null;
      location: string | null;
    }[]
  > {
    const follows = await this.followRepo.find({
      where: { follower: { id: userId } },
      relations: ['following'],
      order: { createdAt: 'DESC' },
    });

    return follows.map((f) => ({
      id: f.following.id,
      fullName: f.following.fullName,
      avatarUrl: f.following.avatarUrl ?? null,
      location: f.following.location ?? null,
    }));
  }

  async getFollowers(
    userId: string,
  ): Promise<
    {
      id: string;
      fullName: string;
      avatarUrl: string | null;
      location: string | null;
    }[]
  > {
    const follows = await this.followRepo.find({
      where: { following: { id: userId } },
      relations: ['follower'],
      order: { createdAt: 'DESC' },
    });

    return follows.map((f) => ({
      id: f.follower.id,
      fullName: f.follower.fullName,
      avatarUrl: f.follower.avatarUrl ?? null,
      location: f.follower.location ?? null,
    }));
  }

  async getFollowerCount(userId: string): Promise<number> {
    return this.followRepo.count({
      where: { following: { id: userId } },
    });
  }

  async getFollowingCount(userId: string): Promise<number> {
    return this.followRepo.count({
      where: { follower: { id: userId } },
    });
  }
}
