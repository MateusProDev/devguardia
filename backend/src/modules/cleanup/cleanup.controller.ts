import { Controller, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CleanupService } from './cleanup.service';

@Controller('cleanup')
export class CleanupController {
  constructor(private readonly cleanupService: CleanupService) {}

  @Post('pageviews')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  async cleanupPageViews() {
    return this.cleanupService.cleanupOldPageViews();
  }
}
