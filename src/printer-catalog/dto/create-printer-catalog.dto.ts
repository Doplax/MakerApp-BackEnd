import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePrinterCatalogDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model!: string;

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

  @IsInt()
  @IsPositive()
  @IsOptional()
  powerConsumption?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  extruderMaxTemp?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  bedMaxTemp?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  maxSpeed?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  extruderCount?: number;

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
  imageUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
