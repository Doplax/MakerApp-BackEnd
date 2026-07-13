import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Importes en EUROS (el servicio los pasa a céntimos). */
export class CreateQuoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  reference!: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  concept?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  clientName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  clientNif?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  clientAddress?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  /** Base imponible en euros (el IVA se añade por encima). */
  @IsNumber()
  @Min(0)
  base!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(30)
  vatPercent?: number;
}
