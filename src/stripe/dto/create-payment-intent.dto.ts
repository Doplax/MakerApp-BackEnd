import {
  IsInt,
  IsPositive,
  IsUUID,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePaymentIntentDto {
  /** ID del proyecto a pagar */
  @IsUUID()
  projectId!: string;

  /** Cantidad en céntimos (ej: 1500 = 15.00 €) */
  @IsInt()
  @IsPositive()
  amount!: number;

  /** Código de moneda ISO 4217 (default: eur) */
  @IsString()
  @IsOptional()
  currency?: string;
}
