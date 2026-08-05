import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Opción de compra de un ítem del catálogo (proveedor + enlace + precio). */
export class CreatePurchaseOptionDto {
  @IsUUID()
  catalogId!: string;

  @IsString()
  @MaxLength(120)
  vendorName!: string;

  @IsString()
  @IsOptional()
  vendorLogoUrl?: string;

  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  url!: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  /** Valoración manual de la tienda, 0–5 (p. ej. 4.8). */
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class UpdatePurchaseOptionDto extends PartialType(
  CreatePurchaseOptionDto,
) {}
