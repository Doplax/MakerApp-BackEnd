import { IsOptional, IsPositive, Min, Max, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(1000) // tope máximo: evita volcados ilimitados pero permite "todo mi inventario"
  @Type(() => Number)
  limit?: number = 20;
}
