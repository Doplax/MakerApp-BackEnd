import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PrintStatus } from '../../common/enums/index.js';

export class CreatePrintLogDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsPositive()
  weightUsed!: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  printDuration?: number;

  @IsEnum(PrintStatus)
  @IsOptional()
  status?: PrintStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsUUID()
  @IsNotEmpty()
  filamentId!: string;

  @IsUUID()
  @IsOptional()
  printerId?: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsNumber()
  @IsOptional()
  copies?: number;
}
