import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * POST /upload/image
   * Campo: "file" (multipart/form-data)
   * Retorna: { url: string }
   */
  @Post('image')
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ short: { ttl: 60000, limit: 20 } })
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage() }),
  )
  async uploadImage(@UploadedFile() file: any) {
    const url = await this.uploadService.uploadImage(file);
    return { url };
  }
}
