import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service.js';
import type {
  CloudinaryFolder,
  DocumentFolder,
} from './cloudinary.service.js';
import { StorageSweeperService } from './storage-sweeper.service.js';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums/index.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_DOC_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
/** Horas mínimas de antigüedad para considerar un fichero huérfano (evita borrar subidas en curso). */
const DEFAULT_GRACE_HOURS = 24;

@Controller('upload')
@UseGuards(AuthGuard('jwt'))
export class CloudinaryController {
  constructor(
    private readonly cloudinary: CloudinaryService,
    private readonly sweeper: StorageSweeperService,
  ) {}

  /** Dry-run (solo admin): lista los ficheros huérfanos que se borrarían, sin tocar nada. */
  @Get('orphans')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  scanOrphans(@Query('graceHours') graceHours?: string) {
    return this.sweeper.scan(this.parseGrace(graceHours));
  }

  /** Barrido real (solo admin): borra del volumen los ficheros huérfanos. */
  @Post('sweep')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  sweepOrphans(@Query('graceHours') graceHours?: string) {
    return this.sweeper.sweep(this.parseGrace(graceHours));
  }

  private parseGrace(value?: string): number {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_GRACE_HOURS;
  }

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Solo se permiten imágenes'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: CloudinaryFolder = 'projects',
    @CurrentUser() user: User,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');

    const validFolders: CloudinaryFolder[] = [
      'avatars',
      'projects',
      'printers',
      'filaments',
      'invoices',
    ];
    if (!validFolders.includes(folder)) {
      throw new BadRequestException(
        `Carpeta inválida. Válidas: ${validFolders.join(', ')}`,
      );
    }

    const publicId = `${folder}-${user.id}-${Date.now()}`;
    const result = await this.cloudinary.uploadBuffer(
      file.buffer,
      folder,
      publicId,
    );

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    };
  }

  @Post('document')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_DOC_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(
            new BadRequestException('Solo se permiten documentos PDF'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: DocumentFolder = 'documents',
    @CurrentUser() user: User,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');

    const validFolders: DocumentFolder[] = ['documents', 'licenses'];
    if (!validFolders.includes(folder)) {
      throw new BadRequestException(
        `Carpeta inválida. Válidas: ${validFolders.join(', ')}`,
      );
    }

    const publicId = `${folder}-${user.id}-${Date.now()}`;
    const result = await this.cloudinary.uploadDocument(
      file.buffer,
      folder,
      publicId,
    );

    return {
      url: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
    };
  }

  // NOTA: no exponemos un DELETE por URL. El borrado se hace de forma segura y con
  // control de propiedad desde los servicios de cada entidad (al reemplazar la
  // imagen o borrar el recurso). Un DELETE por URL sin verificar propiedad sería un
  // IDOR destructivo (borrar ficheros de otros usuarios).
}
