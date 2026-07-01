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

  /**
   * @deprecated El importe se DERIVA del precio del proyecto en el servidor.
   * Se mantiene opcional solo por compatibilidad con clientes antiguos; se IGNORA.
   */
  @IsInt()
  @IsPositive()
  @IsOptional()
  amount?: number;

  /** Código de moneda ISO 4217 (default: eur) */
  @IsString()
  @IsOptional()
  currency?: string;
}
