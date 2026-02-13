import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StatisticsService } from './statistics.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

@Controller('statistics')
@UseGuards(AuthGuard('jwt'))
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  getDashboardStats(@CurrentUser() user: User) {
    return this.statisticsService.getDashboardStats(user);
  }
}
