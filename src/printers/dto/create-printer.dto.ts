import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePrinterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model: string;

  @IsString()
  @IsIn(['FDM', 'SLA', 'SLS', 'DLP'])
  @IsOptional()
  type?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  buildVolumeX?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  buildVolumeY?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  buildVolumeZ?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  nozzleDiameter?: number;

  @IsString()
  @IsIn(['idle', 'printing', 'maintenance', 'offline'])
  @IsOptional()
  status?: string;

  @IsOptional()
  purchaseDate?: Date;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
