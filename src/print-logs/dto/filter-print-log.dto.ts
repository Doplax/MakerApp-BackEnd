import { IsEnum, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { PrintStatus } from '../../common/enums/index.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class FilterPrintLogDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PrintStatus)
  status?: PrintStatus;

  @IsOptional()
  @IsUUID()
  filamentId?: string;

  @IsOptional()
  @IsUUID()
  printerId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
