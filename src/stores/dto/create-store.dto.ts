import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MaterialType } from '../../common/enums/index.js';

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  url!: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  // ── Ubicación del negocio físico (se pinta en el mapa) ─────────
  // Mismos límites que el perfil del maker (`update-profile.dto.ts`).
  // `@IsOptional()` ignora también `null` → permite limpiar la ubicación.
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  address?: string | null;

  /** Materiales de filamento que vende (subconjunto de MaterialType). */
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(20)
  @IsEnum(MaterialType, { each: true })
  materials?: MaterialType[] | null;

  /** Si además vende impresoras 3D. */
  @IsBoolean()
  @IsOptional()
  sellsPrinters?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
