import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { imageSize } from 'image-size';

export type CloudinaryFolder =
  | 'avatars'
  | 'projects'
  | 'printers'
  | 'filaments'
  | 'invoices';

/** Subcarpetas donde se guardan DOCUMENTOS (no imágenes): licencias, etc. */
export type DocumentFolder = 'documents' | 'licenses';

export interface UploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  bytes: number;
}

export interface DocumentUploadResult {
  secure_url: string;
  public_id: string;
  bytes: number;
}

/**
 * Almacenamiento de imágenes en disco local (volumen persistente del VPS).
 * Mantiene el nombre/API histórico de "CloudinaryService" para no romper a sus
 * consumidores; internamente ya NO usa Cloudinary, guarda en `UPLOAD_DIR` y los
 * ficheros se sirven como estáticos en `/uploads` (ver main.ts).
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  /** Carpeta física donde se guardan los ficheros (montada como volumen). */
  private readonly uploadDir: string;
  /** Origen público del backend para construir las URLs (ej. https://api.makerup.app). */
  private readonly publicBase: string;

  private static readonly ALLOWED = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  /** Tamaño máximo de un documento (10 MB). */
  private static readonly MAX_DOC_BYTES = 10 * 1024 * 1024;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = this.config.get<string>(
      'UPLOAD_DIR',
      path.resolve(process.cwd(), 'uploads'),
    );
    this.publicBase = (this.config.get<string>('PUBLIC_URL') ?? '').replace(
      /\/+$/,
      '',
    );
  }

  async uploadBuffer(
    buffer: Buffer,
    subfolder: CloudinaryFolder,
    publicId?: string,
  ): Promise<UploadResult> {
    let dimensions: { width?: number; height?: number; type?: string };
    try {
      dimensions = imageSize(buffer);
    } catch {
      throw new BadRequestException('Archivo de imagen no válido');
    }

    const type = (dimensions.type ?? '').toLowerCase();
    if (!CloudinaryService.ALLOWED.includes(type)) {
      throw new BadRequestException(
        'Formato no permitido (jpg, jpeg, png, webp, gif)',
      );
    }
    const ext = type === 'jpeg' ? 'jpg' : type;

    const id = publicId ?? `${subfolder}-${Date.now()}`;
    const fileName = `${id}.${ext}`;
    const dir = path.join(this.uploadDir, subfolder);
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, fileName), buffer);
    } catch (err) {
      // Volumen no montado, permisos (EACCES/EROFS) o disco lleno (ENOSPC)
      this.logger.error(
        `No se pudo guardar la imagen en ${dir}: ${(err as Error)?.message}`,
        err as Error,
      );
      throw new InternalServerErrorException('No se pudo guardar la imagen');
    }

    return {
      secure_url: `${this.publicBase}/uploads/${subfolder}/${fileName}`,
      public_id: `${subfolder}/${id}`,
      width: dimensions.width ?? 0,
      height: dimensions.height ?? 0,
      bytes: buffer.length,
    };
  }

  /**
   * Guarda un DOCUMENTO (por ahora solo PDF: licencias de proyectos, etc.).
   * A diferencia de las imágenes, se valida por "magic bytes" (`%PDF-`) y no por
   * dimensiones. Se sirve como estático en `/uploads/<subfolder>/…` igual que las
   * imágenes. El tipo de contenido se restringe a PDF para evitar servir HTML/SVG
   * ejecutable (XSS) desde el mismo origen del backend.
   */
  async uploadDocument(
    buffer: Buffer,
    subfolder: DocumentFolder,
    publicId?: string,
  ): Promise<DocumentUploadResult> {
    if (!buffer?.length) {
      throw new BadRequestException('Documento vacío');
    }
    if (buffer.length > CloudinaryService.MAX_DOC_BYTES) {
      throw new BadRequestException('El documento supera el tamaño máximo (10 MB)');
    }
    // Magic bytes de PDF: "%PDF-" al inicio del fichero.
    const header = buffer.subarray(0, 5).toString('latin1');
    if (header !== '%PDF-') {
      throw new BadRequestException('Formato no permitido (solo PDF)');
    }

    const id = publicId ?? `${subfolder}-${Date.now()}`;
    const fileName = `${id}.pdf`;
    const dir = path.join(this.uploadDir, subfolder);
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, fileName), buffer);
    } catch (err) {
      this.logger.error(
        `No se pudo guardar el documento en ${dir}: ${(err as Error)?.message}`,
        err as Error,
      );
      throw new InternalServerErrorException('No se pudo guardar el documento');
    }

    return {
      secure_url: `${this.publicBase}/uploads/${subfolder}/${fileName}`,
      public_id: `${subfolder}/${id}`,
      bytes: buffer.length,
    };
  }

  async deleteByUrl(url: string): Promise<void> {
    try {
      const marker = '/uploads/';
      const idx = url.indexOf(marker);
      if (idx === -1) return;
      const relative = url.substring(idx + marker.length); // subfolder/fichero.ext
      const filePath = path.resolve(this.uploadDir, relative);
      // Seguridad: no permitir salir de uploadDir (path traversal)
      if (!filePath.startsWith(path.resolve(this.uploadDir))) return;
      await fs.unlink(filePath).catch(() => undefined);
    } catch (err) {
      this.logger.warn(`No se pudo borrar el fichero: ${url}`, err as Error);
    }
  }
}
