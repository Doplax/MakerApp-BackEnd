import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateFilamentCatalogDto } from './create-filament-catalog.dto.js';

export class UpdateFilamentCatalogDto extends PartialType(
  CreateFilamentCatalogDto,
) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
