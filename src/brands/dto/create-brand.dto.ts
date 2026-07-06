import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsIn(['filament', 'printer', 'both'])
  scope?: 'filament' | 'printer' | 'both';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
