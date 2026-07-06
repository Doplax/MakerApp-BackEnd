/**
 * Clave normalizada de una marca: minúsculas, unifica variantes conocidas
 * ("Prusa Research" → prusa, "Bambu Lab" → bambulab) y quita todo lo que no sea
 * alfanumérico. Sirve para agrupar el texto libre actual ("Bambu Lab" vs
 * "Bambulab" vs "BambuLab") en una única marca y para reconciliar en escritura.
 * Mismo criterio que el resolver de imágenes de impresora del front.
 */
export function normalizeBrand(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/prusa\s*research/g, 'prusa')
    .replace(/bambu\s*lab/g, 'bambulab')
    .replace(/[^a-z0-9]/g, '');
}
