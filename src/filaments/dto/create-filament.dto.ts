import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { MaterialType, FilamentStatus } from '../../common/enums/index.js';

export class CreateFilamentDto {
  @IsUUID()
  @IsOptional()
  catalogFilamentId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  brand?: string;

  @IsEnum(MaterialType)
  @IsOptional()
  material?: MaterialType;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  color?: string;

  @IsString()
  @IsOptional()
  @MaxLength(7)
  colorHex?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  diameter?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  density?: number;

  @IsInt()
  @IsPositive()
  totalWeight!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  remainingWeight?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  supplier?: string;

  @IsInt()
  @IsOptional()
  printTempMin?: number;

  @IsInt()
  @IsOptional()
  printTempMax?: number;

  @IsInt()
  @IsOptional()
  bedTempMin?: number;

  @IsInt()
  @IsOptional()
  bedTempMax?: number;

  @IsEnum(FilamentStatus)
  @IsOptional()
  status?: FilamentStatus;

  @IsOptional()
  purchaseDate?: Date;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  spoolType?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
