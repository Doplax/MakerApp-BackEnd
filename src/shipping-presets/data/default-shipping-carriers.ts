/**
 * Catálogo de transportistas que **facilita la plataforma** (decisión de
 * producto, jul-2026): el maker no tiene que teclear las tarifas de cero —
 * elige un proveedor de esta lista, se le precargan los tramos de peso y a
 * partir de ahí **puede editarlos** (su preset es una copia propia, no una
 * referencia viva a este catálogo).
 *
 * Por eso vive en el back como constante y NO en una tabla: es contenido
 * curado por nosotros, se sirve en `GET /shipping-presets/carriers` y
 * actualizarlo es un deploy del back (el front no necesita cambios).
 *
 * ⚠️ Precios de referencia (tarifas estándar peninsular, IVA no incluido).
 * Son orientativos: cada maker negocia los suyos con el transportista, de ahí
 * que el formulario permita editarlos.
 */

/** Tramo de peso: `minWeight` incluido, `maxWeight` excluido. */
export interface ShippingRate {
  minWeight: number;
  maxWeight: number;
  price: number;
}

export interface DefaultShippingCarrier {
  /** Clave estable (se guarda en el preset para saber de dónde salió). */
  code: string;
  /** Precarga de "Nombre del Preset". */
  presetName: string;
  /** Precarga de "Nombre del Proveedor". */
  carrierName: string;
  /** Servicio concreto, para que el maker distinga en el desplegable. */
  description: string;
  rates: ShippingRate[];
}

/** Tramos comunes a todos los proveedores (kg). */
const WEIGHT_TIERS: ReadonlyArray<readonly [number, number]> = [
  [0, 5],
  [5, 10],
  [10, 15],
  [15, 20],
  [20, 30],
  [30, 40],
  [40, 50],
];

/**
 * Los 7 precios de cada proveedor van en el mismo orden que `WEIGHT_TIERS`.
 * Se declaran así (y no repitiendo min/max siete veces por proveedor) para
 * que añadir un tramo o un transportista sea una línea y no se descuadren.
 */
const buildRates = (prices: readonly number[]): ShippingRate[] =>
  WEIGHT_TIERS.map(([minWeight, maxWeight], i) => ({
    minWeight,
    maxWeight,
    price: prices[i],
  }));

export const DEFAULT_SHIPPING_CARRIERS: readonly DefaultShippingCarrier[] = [
  {
    code: 'correos-paq-estandar',
    presetName: 'Correos - Paq estándar',
    carrierName: 'Correos',
    description: 'Correos de España - Servicio Paq estándar peninsular',
    rates: buildRates([5.5, 7.8, 10.2, 12.5, 16.8, 21, 25.5]),
  },
  {
    code: 'seur-estandar',
    presetName: 'SEUR - Estándar',
    carrierName: 'SEUR',
    description: 'SEUR - Envío estándar nacional peninsular',
    rates: buildRates([7.2, 9.5, 12.8, 15.9, 20.5, 25.8, 31]),
  },
  {
    code: 'mrw-urgente',
    presetName: 'MRW - Urgente',
    carrierName: 'MRW',
    description: 'MRW - Servicio urgente nacional (entrega día siguiente)',
    rates: buildRates([8.5, 11.2, 14.5, 17.8, 23, 28.5, 34]),
  },
  {
    code: 'gls-businessparcel',
    presetName: 'GLS - BusinessParcel',
    carrierName: 'GLS',
    description: 'GLS Spain - BusinessParcel estándar peninsular',
    rates: buildRates([6.8, 8.9, 11.5, 14.2, 18.5, 23, 28]),
  },
  {
    code: 'nacex-e-nacex',
    presetName: 'Nacex - e-Nacex',
    carrierName: 'Nacex',
    description: 'Nacex - Servicio e-Nacex para e-commerce peninsular',
    rates: buildRates([6.5, 8.7, 11.2, 13.8, 18, 22.5, 27.5]),
  },
];
