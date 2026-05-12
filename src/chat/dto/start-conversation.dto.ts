import { IsUUID } from 'class-validator';

export class StartConversationDto {
  /** Id del otro participante (1:1). */
  @IsUUID()
  userId!: string;
}
