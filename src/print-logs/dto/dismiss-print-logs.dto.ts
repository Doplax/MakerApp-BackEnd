import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

/** Ids de impresiones completadas a retirar del kanban ("limpiar columna"). */
export class DismissPrintLogsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  ids!: string[];
}
