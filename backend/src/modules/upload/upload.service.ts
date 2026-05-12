import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    folder = 'devguard-marketplace',
  ): Promise<string> {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');

    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato não permitido. Use JPEG, PNG, WebP, GIF ou AVIF.',
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('Imagem muito grande. Máximo: 10MB.');
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new BadRequestException('Upload de imagem não configurado.');
    }

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error('Cloudinary upload failed', error);
            return reject(new BadRequestException('Falha ao enviar imagem.'));
          }
          resolve(result.secure_url);
        },
      );
      stream.end(file.buffer);
    });
  }
}
