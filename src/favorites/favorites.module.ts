import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectFavorite } from './entities/project-favorite.entity.js';
import { FavoriteList } from './entities/favorite-list.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { FavoritesService } from './favorites.service.js';
import { FavoritesController } from './favorites.controller.js';
import { FavoriteListsController } from './favorite-lists.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectFavorite, FavoriteList, Project])],
  controllers: [FavoritesController, FavoriteListsController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
