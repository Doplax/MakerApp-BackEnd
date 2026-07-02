import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

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
}
