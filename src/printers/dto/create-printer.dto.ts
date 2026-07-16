import {
  IsArray,
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

export class CreatePrinterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

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

  @IsArray()
  @IsNumber({}, { each: true })
  @IsPositive({ each: true })
  @IsOptional()
  nozzleDiameters?: number[];

  @IsInt()
  @Min(0)
  @IsOptional()
  initialPrintHours?: number;

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

  @IsString()
  @IsOptional()
  @MaxLength(100)
  serialNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  storeUrl?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  purchasePrice?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  amortizationMonths?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  powerConsumption?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  maintenanceSimpleHours?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  maintenanceFullHours?: number;

  @IsOptional()
  lastMaintenanceSimpleAt?: Date;

  @IsOptional()
  lastMaintenanceFullAt?: Date;
}
