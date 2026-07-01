import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service.js';
import { User } from '../users/entities/user.entity.js';
import { Filament } from '../filaments/entities/filament.entity.js';
import { Printer } from '../printers/entities/printer.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { PrintLog } from '../print-logs/entities/print-log.entity.js';
import { Conversation } from '../chat/entities/conversation.entity.js';
import { ConversationParticipant } from '../chat/entities/conversation-participant.entity.js';
import { Message } from '../chat/entities/message.entity.js';
import { Purchase } from '../purchases/entities/purchase.entity.js';
import { Review } from '../reviews/entities/review.entity.js';
import { MakerReview } from '../maker-reviews/entities/maker-review.entity.js';
import { Follow } from '../follows/entities/follow.entity.js';
import { Notification } from '../notifications/entities/notification.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Filament,
      Printer,
      Project,
      PrintLog,
      Conversation,
      ConversationParticipant,
      Message,
      Purchase,
      Review,
      MakerReview,
      Follow,
      Notification,
    ]),
  ],
  // El seed es DESTRUCTIVO (TRUNCATE): NO se expone por HTTP. Solo vía CLI (seed.runner).
  providers: [SeedService],
})
export class SeedModule {}
