import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class FilterPrinterCatalogDto extends PaginationDto {
  @IsString()
  @IsIn(['FDM', 'SLA', 'SLS', 'DLP'])
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
