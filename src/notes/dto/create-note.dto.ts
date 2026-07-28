import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { NOTE_COLORS } from '../entities/note.entity.js';
import type { NoteColor } from '../entities/note.entity.js';

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  content?: string;

  @IsIn(NOTE_COLORS)
  @IsOptional()
  color?: NoteColor;

  @IsBoolean()
  @IsOptional()
  pinned?: boolean;

  /**
   * Proyecto opcional. `@IsOptional` acepta también `null` (en el PATCH,
   * null = desvincular la nota del proyecto y dejarla como general).
   */
  @IsUUID()
  @IsOptional()
  projectId?: string | null;
}
