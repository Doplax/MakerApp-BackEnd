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

  /**
   * @deprecated La moneda se DERIVA en el servidor: el precio del proyecto está en
   * EUR, así que el PaymentIntent se crea siempre en 'eur'. Este campo se IGNORA
   * (evita que el cliente fuerce otra divisa y desajuste el importe).
   */
  @IsString()
  @IsOptional()
  currency?: string;
}
