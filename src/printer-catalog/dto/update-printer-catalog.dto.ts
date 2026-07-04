import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreatePrinterCatalogDto } from './create-printer-catalog.dto.js';

export class UpdatePrinterCatalogDto extends PartialType(
  CreatePrinterCatalogDto,
) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
