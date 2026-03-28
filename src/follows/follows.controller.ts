import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FollowsService } from './follows.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

@Controller('follows')
@UseGuards(AuthGuard('jwt'))
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post(':makerId')
  async follow(
    @CurrentUser() user: User,
    @Param('makerId', ParseUUIDPipe) makerId: string,
  ) {
    return this.followsService.follow(user.id, makerId);
  }

  @Delete(':makerId')
  async unfollow(
    @CurrentUser() user: User,
    @Param('makerId', ParseUUIDPipe) makerId: string,
  ) {
    return this.followsService.unfollow(user.id, makerId);
  }

  @Get('check/:makerId')
  async isFollowing(
    @CurrentUser() user: User,
    @Param('makerId', ParseUUIDPipe) makerId: string,
  ) {
    const following = await this.followsService.isFollowing(user.id, makerId);
    return { following };
  }

  @Get('my/following')
  async getMyFollowing(@CurrentUser() user: User) {
    return this.followsService.getFollowing(user.id);
  }

  @Get('count/:makerId')
  async getFollowerCount(@Param('makerId', ParseUUIDPipe) makerId: string) {
    const followers = await this.followsService.getFollowerCount(makerId);
    return { followers };
  }
}
