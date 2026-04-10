import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';

export type CloudinaryFolder = 'avatars' | 'projects' | 'printers' | 'filaments' | 'invoices';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly folder: string;

  constructor(private readonly config: ConfigService) {
    this.folder = config.get<string>('CLOUDINARY_FOLDER', 'makerup');

    cloudinary.config({
      cloud_name: config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key:    config.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: config.getOrThrow<string>('CLOUDINARY_API_SECRET'),
      secure:     true,
    });
  }

  async uploadBuffer(
    buffer: Buffer,
    subfolder: CloudinaryFolder,
    publicId?: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder:          `${this.folder}/${subfolder}`,
          public_id:       publicId,
          resource_type:   'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
          transformation:  [{ width: 1200, crop: 'limit', quality: 'auto:good' }],
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve(result);
        },
      );
      Readable.from(buffer).pipe(upload);
    });
  }

  async deleteByUrl(url: string): Promise<void> {
    try {
      // Extraer publicId desde la URL de Cloudinary
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
      if (!match) return;
      const publicId = match[1];
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      this.logger.warn(`Failed to delete Cloudinary asset: ${url}`, err);
    }
  }
}
