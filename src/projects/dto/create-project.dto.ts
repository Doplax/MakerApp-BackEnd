import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
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

  // ── Kanban ──────────────────────────────────────────────────
  @IsString()
  @IsIn(['pending', 'in_progress', 'done'])
  @IsOptional()
  kanbanStatus?: string;

  @IsOptional()
  orderDeadline?: Date;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  // ── Visibilidad ─────────────────────────────────────────────
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  // ── Diseño ──────────────────────────────────────────────────
  @IsString()
  @IsIn(['own', 'licensed'])
  @IsOptional()
  designType?: string;

  @IsString()
  @IsOptional()
  licenseFileUrl?: string;

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

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  filamentIds?: string[];

  @IsUUID('4')
  @IsOptional()
  printerId?: string;
}
