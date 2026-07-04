import { IsString, Matches } from 'class-validator';

/** Reconciliación de una compra: el cliente envía el id del PaymentIntent. */
export class ConfirmPurchaseDto {
  @IsString()
  @Matches(/^pi_[A-Za-z0-9_]+$/, { message: 'paymentIntentId inválido' })
  paymentIntentId!: string;
}
