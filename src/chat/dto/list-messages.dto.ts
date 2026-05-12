import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListMessagesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** ISO timestamp; devuelve mensajes con createdAt < `before` (paginación hacia atrás). */
  @IsOptional()
  @IsString()
  before?: string;
}
