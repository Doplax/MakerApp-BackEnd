import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FollowsService } from './follows.service.js';

@Controller('follows')
@UseGuards(AuthGuard('jwt'))
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post(':makerId')
  async follow(
    @Request() req: any,
    @Param('makerId', ParseUUIDPipe) makerId: string,
  ) {
    return this.followsService.follow(req.user.id, makerId);
  }

  @Delete(':makerId')
  async unfollow(
    @Request() req: any,
    @Param('makerId', ParseUUIDPipe) makerId: string,
  ) {
    return this.followsService.unfollow(req.user.id, makerId);
  }

  @Get('check/:makerId')
  async isFollowing(
    @Request() req: any,
    @Param('makerId', ParseUUIDPipe) makerId: string,
  ) {
    const following = await this.followsService.isFollowing(req.user.id, makerId);
    return { following };
  }

  @Get('my/following')
  async getMyFollowing(@Request() req: any) {
    return this.followsService.getFollowing(req.user.id);
  }

  @Get('count/:makerId')
  async getFollowerCount(@Param('makerId', ParseUUIDPipe) makerId: string) {
    const followers = await this.followsService.getFollowerCount(makerId);
    return { followers };
  }
}
