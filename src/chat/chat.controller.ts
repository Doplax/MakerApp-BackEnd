import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service.js';
import { StartConversationDto } from './dto/start-conversation.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { ListMessagesDto } from './dto/list-messages.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  list(@CurrentUser() user: User) {
    return this.chatService.listForUser(user);
  }

  @Post('conversations')
  start(@Body() dto: StartConversationDto, @CurrentUser() user: User) {
    return this.chatService
      .startOrGetDirectConversation(user, dto.userId)
      .then((c) => this.chatService.getConversation(user, c.id));
  }

  @Get('conversations/:id')
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.chatService.getConversation(user, id);
  }

  @Get('conversations/:id/messages')
  messages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListMessagesDto,
    @CurrentUser() user: User,
  ) {
    return this.chatService.listMessages(user, id, {
      limit: query.limit,
      before: query.before,
    });
  }

  @Post('conversations/:id/messages')
  send(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: User,
  ) {
    return this.chatService.sendMessage(user, id, dto.body);
  }

  @Post('conversations/:id/read')
  @HttpCode(204)
  async read(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.chatService.markAsRead(user, id);
  }
}
