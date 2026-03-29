import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { MaterialType } from '../../common/enums/index.js';

export class CreateFilamentCatalogDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand!: string;

  @IsEnum(MaterialType)
  @IsNotEmpty()
  material!: MaterialType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  color!: string;

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
  @IsOptional()
  defaultWeight?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  referencePrice?: number;

  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  purchaseUrl?: string;

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

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
