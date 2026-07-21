import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateColorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  // Background CSS del swatch (hex o gradiente).
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  swatch!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
