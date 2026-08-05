import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** Ítem del checklist tal y como lo vio el maker (label ya en su idioma). */
export class MaintenanceChecklistItemDto {
  @IsString()
  @MaxLength(120)
  label!: string;

  @IsBoolean()
  done!: boolean;
}

export class CreateMaintenanceDto {
  @IsIn(['simple', 'full'])
  type!: 'simple' | 'full';

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => MaintenanceChecklistItemDto)
  checklist?: MaintenanceChecklistItemDto[];
}
