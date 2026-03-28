import { UserRole } from '../../common/enums/index.js';

export interface UserSeed {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  bio?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  avatarUrl?: string;
}

export const usersToSeed: UserSeed[] = [
  {
    fullName: 'Admin MakerUpp',
    email: 'admin@MakerUpp.com',
    password: 'admin123456',
    role: UserRole.ADMIN,
    bio: 'Administrador de la plataforma MakerUpp. Apasionado de la impresión 3D desde 2015.',
    location: 'Madrid, España',
    latitude: 40.4168,
    longitude: -3.7038,
  },
  {
    fullName: 'Pol Valle',
    email: 'doplax@gmail.com',
    password: 'P@ssw0rd',
    role: UserRole.ADMIN,
    bio: 'Maker & developer. Diseño piezas funcionales para proyectos de electrónica y domótica.',
    location: 'Barcelona, España',
    latitude: 41.3851,
    longitude: 2.1734,
  },
  {
    fullName: 'Maker Demo',
    email: 'demo@MakerUpp.com',
    password: 'demo123456',
    role: UserRole.USER,
    bio: 'Cuenta de demostración. Impresoras FDM y resina para maquetas y miniaturas.',
    location: 'Valencia, España',
    latitude: 39.4699,
    longitude: -0.3763,
  },
  {
    fullName: 'Ana Martínez',
    email: 'ana.maker@example.com',
    password: 'maker123456',
    role: UserRole.USER,
    bio: 'Diseñadora industrial reconvertida al mundo maker. Especialista en piezas de ingeniería y prototipos.',
    location: 'Sevilla, España',
    latitude: 37.3891,
    longitude: -5.9845,
  },
  {
    fullName: 'Mikel Etxebarria',
    email: 'mikel.3d@example.com',
    password: 'maker123456',
    role: UserRole.USER,
    bio: 'Imprimo piezas de recambio para coches clásicos y prototipos industriales. Bambu Lab P1S.',
    location: 'Bilbao, España',
    latitude: 43.263,
    longitude: -2.935,
  },
  {
    fullName: 'Sophie Dubois',
    email: 'sophie.print@example.com',
    password: 'maker123456',
    role: UserRole.USER,
    bio: 'Artiste et maker. Je crée des sculptures et des pièces décoratives avec ma Prusa MK4.',
    location: 'París, Francia',
    latitude: 48.8566,
    longitude: 2.3522,
  },
  {
    fullName: 'Klaus Weber',
    email: 'klaus.maker@example.com',
    password: 'maker123456',
    role: UserRole.USER,
    bio: 'Ingenieur und Maker. Spezialist für technische Druckteile und Robotik-Komponenten.',
    location: 'Berlín, Alemania',
    latitude: 52.52,
    longitude: 13.405,
  },
  {
    fullName: 'Luca Romano',
    email: 'luca.3dprint@example.com',
    password: 'maker123456',
    role: UserRole.USER,
    bio: 'Appassionato di stampa 3D e design. Creo modellini, miniature e pezzi di ricambio.',
    location: 'Milán, Italia',
    latitude: 45.4642,
    longitude: 9.19,
  },
];
