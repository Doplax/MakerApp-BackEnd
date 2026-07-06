import { IsUUID } from 'class-validator';

export class MergeBrandDto {
  /** Marca ORIGEN que se absorbe dentro de la marca destino (:id) y se elimina. */
  @IsUUID()
  sourceId!: string;
}
