import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FavoritesService } from './favorites.service.js';
import {
  CreateFavoriteListDto,
  UpdateFavoriteListDto,
} from './dto/favorites.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

@Controller('favorite-lists')
@UseGuards(AuthGuard('jwt'))
export class FavoriteListsController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  getLists(@CurrentUser() user: User) {
    return this.favorites.getLists(user.id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateFavoriteListDto) {
    return this.favorites.createList(user.id, dto.name);
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFavoriteListDto,
  ) {
    return this.favorites.renameList(user.id, id, dto.name);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.favorites.deleteList(user.id, id);
  }
}
