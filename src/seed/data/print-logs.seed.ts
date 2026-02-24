import { PrintStatus } from '../../common/enums/index.js';

// Índices que referencian los arrays de filamentsToSeed, printersToSeed y projectsToSeed
export const printLogsToSeed: {
  name: string;
  description?: string;
  weightUsed: number;
  printDuration?: number;
  status: PrintStatus;
  notes?: string;
  filamentIndex: number;
  printerIndex: number;
  projectIndex?: number;
}[] = [
  {
    name: 'Carcasa RPi5 - Base',
    description: 'Parte inferior de la carcasa',
    weightUsed: 25,
    printDuration: 65,
    status: PrintStatus.COMPLETED,
    filamentIndex: 0, // PLA Blanco (Sunlu)
    printerIndex: 0, // Prusa MK4
    projectIndex: 0, // Carcasa Raspberry Pi 5
  },
  {
    name: 'Carcasa RPi5 - Tapa',
    description: 'Parte superior con ventilación',
    weightUsed: 20,
    printDuration: 55,
    status: PrintStatus.COMPLETED,
    filamentIndex: 0, // PLA Blanco (Sunlu)
    printerIndex: 0, // Prusa MK4
    projectIndex: 0, // Carcasa Raspberry Pi 5
  },
  {
    name: 'Organizador - Módulo 1',
    description: 'Primer módulo del organizador',
    weightUsed: 85,
    printDuration: 180,
    status: PrintStatus.COMPLETED,
    filamentIndex: 1, // PLA Negro (eSun)
    printerIndex: 2, // Bambu Lab P1S
    projectIndex: 1, // Organizador de escritorio
  },
  {
    name: 'Soporte teléfono v1',
    description: 'Primera versión del soporte',
    weightUsed: 40,
    printDuration: 95,
    status: PrintStatus.FAILED,
    notes: 'Warping en la base, aumentar temp de cama',
    filamentIndex: 3, // ABS Rojo (Hatchbox)
    printerIndex: 1, // Ender 3 V3
    projectIndex: 2, // Soporte para teléfono
  },
  {
    name: 'Soporte teléfono v2',
    description: 'Segunda versión corregida',
    weightUsed: 35,
    printDuration: 90,
    status: PrintStatus.COMPLETED,
    filamentIndex: 3, // ABS Rojo (Hatchbox)
    printerIndex: 1, // Ender 3 V3
    projectIndex: 2, // Soporte para teléfono
  },
  {
    name: 'Test benchy',
    description: 'Benchy de calibración',
    weightUsed: 15,
    printDuration: 30,
    status: PrintStatus.COMPLETED,
    filamentIndex: 2, // PETG Naranja (Prusament)
    printerIndex: 0, // Prusa MK4
  },
  {
    name: 'Llavero personalizado',
    description: 'Llavero con logo',
    weightUsed: 5,
    printDuration: 15,
    status: PrintStatus.COMPLETED,
    filamentIndex: 5, // Silk Dorado (Sunlu)
    printerIndex: 2, // Bambu Lab P1S
  },
];
