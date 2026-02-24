export const projectsToSeed: {
  name: string;
  description?: string;
  status: string;
  estimatedWeight?: number;
  estimatedTime?: number;
  notes?: string;
}[] = [
  {
    name: 'Carcasa Raspberry Pi 5',
    description:
      'Carcasa con ventilación para Raspberry Pi 5 con soporte para ventilador',
    status: 'completed',
    estimatedWeight: 45,
    estimatedTime: 120,
  },
  {
    name: 'Organizador de escritorio',
    description:
      'Organizador modular con compartimentos para herramientas y accesorios',
    status: 'in_progress',
    estimatedWeight: 200,
    estimatedTime: 480,
  },
  {
    name: 'Soporte para teléfono',
    description: 'Soporte articulado para móvil con ajuste de ángulo',
    status: 'completed',
    estimatedWeight: 35,
    estimatedTime: 90,
  },
  {
    name: 'Maceta autoregante',
    description: 'Maceta con depósito de agua para riego automático',
    status: 'draft',
    estimatedWeight: 150,
    estimatedTime: 300,
  },
];
