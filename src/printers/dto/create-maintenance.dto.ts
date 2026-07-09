import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMaintenanceDto {
  @IsIn(['simple', 'full'])
  type!: 'simple' | 'full';

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  note?: string;
}
