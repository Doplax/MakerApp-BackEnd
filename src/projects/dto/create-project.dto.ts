import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['draft', 'in_progress', 'completed', 'archived'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  stlFileUrl?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  estimatedWeight?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  estimatedTime?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
