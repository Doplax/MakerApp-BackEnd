import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateBrandDto } from './create-brand.dto.js';

export class UpdateBrandDto extends PartialType(CreateBrandDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
