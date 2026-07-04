import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * Referencia a un proyecto que el cliente adjunta a un mensaje. SOLO se acepta
 * el `projectId` (+ discriminador): el resto del snapshot (nombre, imagen,
 * precio, maker) lo DERIVA el servidor desde el proyecto real, para no confiar
 * en datos manipulables por el cliente.
 */
export class MessageAttachmentDto {
  @IsIn(['project'])
  type!: 'project';

  @IsUUID()
  projectId!: string;
}

export class SendMessageDto {
  // Recortamos ANTES de validar para que '   ' (solo espacios) no pase el
  // @MinLength(1). El guard equivalente en ChatService.sendMessage es la
  // defensa imprescindible; esto lo refuerza en la frontera de validación.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MessageAttachmentDto)
  attachment?: MessageAttachmentDto;
}
