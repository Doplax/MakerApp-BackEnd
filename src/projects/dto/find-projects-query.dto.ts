import { IsIn, IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query del listado de proyectos.
 *
 * La paginación es **opt-in**: si NO llegan `page` ni `limit`, el servicio devuelve la
 * lista completa (comportamiento histórico que necesitan el kanban, finanzas, ajustes y
 * el detalle de proyecto). Si llega alguno de los dos, devuelve el envoltorio paginado
 * `{ data, total, page, limit }`. Por eso `page`/`limit` NO llevan valor por defecto:
 * `undefined` es lo que distingue "sin paginar" de "página 1".
 */
export class FindProjectsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(100) // tope de seguridad: evita volcados ilimitados desde el cliente
  limit?: number;

  /** Filtro por antigüedad de creación (coincide con los chips de la UI: Todos/Semana/Mes). */
  @IsOptional()
  @IsIn(['all', 'week', 'month'])
  period?: 'all' | 'week' | 'month';
}
