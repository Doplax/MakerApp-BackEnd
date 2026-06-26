import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FavoritesService } from './favorites.service.js';
import { AddFavoriteDto, SetFavoriteListDto } from './dto/favorites.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

@Controller('favorites')
@UseGuards(AuthGuard('jwt'))
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get('my')
  getMy(@CurrentUser() user: User) {
    return this.favorites.getMyFavorites(user.id);
  }

  @Get('check/:projectId')
  async check(
    @CurrentUser() user: User,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    const favorited = await this.favorites.isFavorited(user.id, projectId);
    return { favorited };
  }

  @Post(':projectId')
  add(
    @CurrentUser() user: User,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: AddFavoriteDto,
  ) {
    return this.favorites.add(user.id, projectId, dto.listId);
  }

  @Delete(':projectId')
  remove(
    @CurrentUser() user: User,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.favorites.remove(user.id, projectId);
  }

  @Patch(':projectId/list')
  setList(
    @CurrentUser() user: User,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: SetFavoriteListDto,
  ) {
    return this.favorites.setList(user.id, projectId, dto.listId);
  }
}
