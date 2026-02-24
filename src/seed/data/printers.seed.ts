export const printersToSeed: {
  name: string;
  brand: string;
  model: string;
  type: string;
  buildVolumeX: number;
  buildVolumeY: number;
  buildVolumeZ: number;
  nozzleDiameter: number;
  status: string;
  notes?: string;
}[] = [
  {
    name: 'Prusa MK4',
    brand: 'Prusa Research',
    model: 'MK4',
    type: 'FDM',
    buildVolumeX: 250,
    buildVolumeY: 210,
    buildVolumeZ: 220,
    nozzleDiameter: 0.4,
    status: 'idle',
    notes: 'Impresora principal, muy fiable',
  },
  {
    name: 'Ender 3 V3',
    brand: 'Creality',
    model: 'Ender 3 V3',
    type: 'FDM',
    buildVolumeX: 220,
    buildVolumeY: 220,
    buildVolumeZ: 250,
    nozzleDiameter: 0.4,
    status: 'idle',
    notes: 'Modificada con direct drive',
  },
  {
    name: 'Bambu Lab P1S',
    brand: 'Bambu Lab',
    model: 'P1S',
    type: 'FDM',
    buildVolumeX: 256,
    buildVolumeY: 256,
    buildVolumeZ: 256,
    nozzleDiameter: 0.4,
    status: 'printing',
    notes: 'CoreXY cerrada, multi-material con AMS',
  },
];
