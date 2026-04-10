import {
  Controller, Post, UploadedFile, UseGuards,
  UseInterceptors, BadRequestException, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService, CloudinaryFolder } from './cloudinary.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class CloudinaryController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Solo se permiten imágenes'), false);
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

    const validFolders: CloudinaryFolder[] = ['avatars', 'projects', 'printers', 'filaments', 'invoices'];
    if (!validFolders.includes(folder)) {
      throw new BadRequestException(`Carpeta inválida. Válidas: ${validFolders.join(', ')}`);
    }

    const publicId = `${folder}-${user.id}-${Date.now()}`;
    const result   = await this.cloudinary.uploadBuffer(file.buffer, folder, publicId);

    return {
      url:      result.secure_url,
      publicId: result.public_id,
      width:    result.width,
      height:   result.height,
      bytes:    result.bytes,
    };
  }
}
