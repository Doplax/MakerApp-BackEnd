import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CustomLinkDto {
  @IsString()
  @MaxLength(100)
  label: string;

  @IsUrl()
  @MaxLength(500)
  url: string;
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  fullName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  location?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  website?: string;

  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  avatarUrl?: string;

  // Redes sociales (solo el handle o username, sin la URL completa)
  @IsString()
  @IsOptional()
  @MaxLength(150)
  tiktok?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  instagram?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  facebook?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  youtube?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  twitter?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CustomLinkDto)
  customLinks?: { label: string; url: string }[];
}
