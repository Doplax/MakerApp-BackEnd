/**
 * Set BASE de colores estándar de filamento con el que se siembra la tabla
 * `colors` al arrancar (idempotente por nombre). El `swatch` es un `background`
 * CSS (hex o gradiente). Ampliar esta lista añade colores nuevos en el siguiente
 * arranque (aditivo, no borra ni pisa los existentes ni los que cree el admin).
 */
export interface DefaultColor {
  name: string;
  swatch: string;
}

export const DEFAULT_COLORS: DefaultColor[] = [
  // Neutros
  { name: 'Negro', swatch: '#1F2937' },
  { name: 'Blanco', swatch: '#F3F4F6' },
  { name: 'Gris', swatch: '#9CA3AF' },
  { name: 'Plata', swatch: 'linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%)' },
  // Rojos / rosas
  { name: 'Rojo', swatch: '#EF4444' },
  { name: 'Granate', swatch: '#7F1D1D' },
  { name: 'Rosa', swatch: '#EC4899' },
  { name: 'Fucsia', swatch: '#D946EF' },
  // Cálidos
  { name: 'Naranja', swatch: '#F97316' },
  { name: 'Amarillo', swatch: '#F59E0B' },
  { name: 'Dorado', swatch: 'linear-gradient(135deg, #FBBF24 0%, #D4A017 100%)' },
  { name: 'Marrón', swatch: '#92400E' },
  { name: 'Beige', swatch: '#E7D8B8' },
  // Verdes
  { name: 'Verde', swatch: '#22C55E' },
  { name: 'Verde oscuro', swatch: '#15803D' },
  { name: 'Menta', swatch: '#6EE7B7' },
  // Azules
  { name: 'Turquesa', swatch: '#06B6D4' },
  { name: 'Celeste', swatch: '#7DD3FC' },
  { name: 'Azul', swatch: '#3B82F6' },
  { name: 'Azul marino', swatch: '#1D4ED8' },
  // Morados
  { name: 'Lavanda', swatch: '#A78BFA' },
  { name: 'Morado', swatch: '#8B5CF6' },
  // Especiales
  { name: 'Transparente', swatch: 'linear-gradient(135deg, #E5E7EB 0%, #FFFFFF 100%)' },
];
