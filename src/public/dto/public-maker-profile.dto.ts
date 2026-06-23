/**
 * DTO para exponer SOLO información pública del perfil del maker
 * No incluye: email, password, role, isActive, createdAt, updatedAt
 */

export class PublicPrinterDto {
  id!: string;
  name!: string;
  brand!: string;
  model!: string;
  type!: string;
  status!: string;
  imageUrl?: string;
}

export class PublicProjectDto {
  id!: string;
  name!: string;
  description?: string;
  imageUrl?: string;
  estimatedWeight?: number;
  estimatedTime?: number;
  price?: number | null;
}

export class PublicFilamentDto {
  id!: string;
  brand!: string;
  material!: string;
  color!: string;
  colorHex!: string | null;
  remainingWeight!: number;
  totalWeight!: number;
  status!: string;
  imageUrl?: string;
}

export class PublicMakerProfileDto {
  id!: string;
  fullName!: string;
  avatarUrl?: string;

  // Información pública del perfil
  bio?: string;
  location?: string;
  website?: string;

  // Redes sociales
  tiktok?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  twitter?: string;

  // Links personalizados
  customLinks?: { label: string; url: string }[];

  // Proyecto destacado del perfil (ID; el cliente lo resuelve sobre `projects`)
  featuredProjectId?: string | null;

  // Datos públicos de relaciones
  printers!: PublicPrinterDto[];
  projects!: PublicProjectDto[];

  // Filamentos públicos del maker (incluidos en el perfil, igual que printers
  // y projects). El endpoint GET /public/makers/:id/filaments sigue disponible.
  filaments!: PublicFilamentDto[];
  filamentCount!: number;

  // Valoración del maker (agregado de MakerReview)
  ratingAverage!: number; // 0–5 (decimales)
  ratingCount!: number; // nº de reseñas

  // Horas de impresión completadas en los últimos 30 días (para el perfil).
  monthlyPrintHours!: number;
}
