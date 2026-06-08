import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ── Lectura pública (para fichas públicas de proyecto) ───────
  @Get('project/:projectId')
  findByProject(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.reviewsService.findByProject(projectId);
  }

  @Get('project/:projectId/average')
  averageRating(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.reviewsService.averageRating(projectId);
  }

  // ── Mutaciones (requieren autenticación) ─────────────────────
  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() dto: CreateReviewDto, @CurrentUser() user: User) {
    return this.reviewsService.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: User,
  ) {
    return this.reviewsService.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.reviewsService.remove(id, user);
  }
}
