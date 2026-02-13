import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MaterialType, FilamentStatus } from '../../common/enums/index.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class FilterFilamentDto extends PaginationDto {
  @IsEnum(MaterialType)
  @IsOptional()
  material?: MaterialType;

  @IsEnum(FilamentStatus)
  @IsOptional()
  status?: FilamentStatus;

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
