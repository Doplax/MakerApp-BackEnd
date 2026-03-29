import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MaterialType } from '../../common/enums/index.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class FilterFilamentCatalogDto extends PaginationDto {
  @IsEnum(MaterialType)
  @IsOptional()
  material?: MaterialType;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
