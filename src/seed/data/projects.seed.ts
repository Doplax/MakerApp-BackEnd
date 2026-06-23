export const projectsToSeed: {
  name: string;
  description?: string;
  estimatedWeight?: number;
  estimatedTime?: number;
  price?: number;
  notes?: string;
}[] = [
  {
    name: 'Carcasa Raspberry Pi 5',
    description:
      'Carcasa con ventilación para Raspberry Pi 5 con soporte para ventilador de 30 mm. Encaje a presión, sin tornillos.',
    estimatedWeight: 45,
    estimatedTime: 120,
    price: 12.0,
  },
  {
    name: 'Organizador de escritorio',
    description:
      'Organizador modular con compartimentos para herramientas, bolígrafos y accesorios. Apilable y personalizable.',
    estimatedWeight: 200,
    estimatedTime: 480,
    price: 18.5,
  },
  {
    name: 'Soporte para teléfono',
    description:
      'Soporte articulado para móvil con ajuste de ángulo y base antideslizante. Compatible con la mayoría de modelos.',
    estimatedWeight: 35,
    estimatedTime: 90,
    price: 8.0,
  },
  {
    name: 'Maceta autoregante',
    description:
      'Maceta con depósito de agua inferior para riego automático por capilaridad. Ideal para plantas de interior.',
    estimatedWeight: 150,
    estimatedTime: 300,
    price: 15.0,
  },
];
