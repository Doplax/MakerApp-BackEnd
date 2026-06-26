import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class AddFavoriteDto {
  /** Lista opcional donde agrupar el favorito. */
  @IsOptional()
  @IsUUID()
  listId?: string;
}

export class SetFavoriteListDto {
  /** Lista destino, o null para quitarlo de cualquier lista. */
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  listId!: string | null;
}

export class CreateFavoriteListDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}

export class UpdateFavoriteListDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}
