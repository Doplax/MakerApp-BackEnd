import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCalendarEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @IsDateString()
  startsAt!: string;

  @IsBoolean()
  @IsOptional()
  done?: boolean;
}
