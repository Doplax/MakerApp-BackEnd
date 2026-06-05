import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** Bandeja: sincroniza el mantenimiento y devuelve lista + nº de no leídas. */
  @Get()
  getInbox(@CurrentUser() user: User) {
    return this.notificationsService.getInbox(user.id);
  }

  /** Solo el contador (para refrescar el badge sin recargar la lista). */
  @Get('unread-count')
  async unreadCount(@CurrentUser() user: User) {
    const count = await this.notificationsService.unreadCount(user.id);
    return { count };
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Patch(':id/read')
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.markRead(id, user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.notificationsService.remove(id, user.id);
  }
}
