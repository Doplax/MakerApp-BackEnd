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

  // Datos públicos de relaciones
  printers!: PublicPrinterDto[];
  projects!: PublicProjectDto[];
}
