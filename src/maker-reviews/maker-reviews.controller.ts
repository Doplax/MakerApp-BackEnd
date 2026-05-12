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
import { AuthGuard } from '@nestjs/passport';
import { MakerReviewsService } from './maker-reviews.service.js';
import { CreateMakerReviewDto } from './dto/create-maker-review.dto.js';
import { UpdateMakerReviewDto } from './dto/update-maker-review.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

@Controller('maker-reviews')
export class MakerReviewsController {
  constructor(private readonly service: MakerReviewsService) {}

  // ── Lectura pública ─────────────────────────────────────────
  @Get('maker/:makerId')
  findByMaker(@Param('makerId', ParseUUIDPipe) makerId: string) {
    return this.service.findByMaker(makerId);
  }

  @Get('maker/:makerId/summary')
  summary(@Param('makerId', ParseUUIDPipe) makerId: string) {
    return this.service.getMakerRatingSummary(makerId);
  }

  // ── Acciones autenticadas ───────────────────────────────────
  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Body() dto: CreateMakerReviewDto, @CurrentUser() user: User) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMakerReviewDto,
    @CurrentUser() user: User,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.remove(id, user);
  }
}
