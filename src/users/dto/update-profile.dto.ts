import {
  IsArray,
  IsBoolean,
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
  label!: string;

  @IsUrl()
  @MaxLength(500)
  url!: string;
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

  // ── Nombre del taller ────────────────────────────────────────
  @IsString()
  @IsOptional()
  @MaxLength(150)
  workshopName?: string;

  // ── Datos de facturación ─────────────────────────────────────
  @IsString()
  @IsOptional()
  @MaxLength(150)
  companyName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  nifCif?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  fiscalAddress?: string;

  @IsString()
  @IsOptional()
  invoiceLogoUrl?: string;

  // ── Costes mensuales (Ajustes) ───────────────────────────────
  @IsNumber()
  @IsOptional()
  @Min(0)
  monthlyElectricityCost?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  monthlyOtherFixedCosts?: number;

  // ── Costes y tarifas ──────────────────────────────────────
  @IsNumber()
  @IsOptional()
  @Min(0)
  electricityCost?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  makerHourlyRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  shippingCostDefault?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  wastagePercent?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  productProfitMargin?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  laborProfitMargin?: number;

  @IsBoolean()
  @IsOptional()
  chargesVat?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  vatPercent?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  mapStyle?: string;
}
