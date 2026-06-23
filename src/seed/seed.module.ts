import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service.js';
import { SeedController } from './seed.controller.js';
import { User } from '../users/entities/user.entity.js';
import { Filament } from '../filaments/entities/filament.entity.js';
import { Printer } from '../printers/entities/printer.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { PrintLog } from '../print-logs/entities/print-log.entity.js';
import { Conversation } from '../chat/entities/conversation.entity.js';
import { ConversationParticipant } from '../chat/entities/conversation-participant.entity.js';
import { Message } from '../chat/entities/message.entity.js';

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
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
