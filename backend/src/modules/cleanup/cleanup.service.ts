import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LIMITS } from '../../common/config/limits.config';

@Injectable()
export class CleanupService {
  constructor(private readonly prisma: PrismaService) {}

  async cleanupOldPageViews(): Promise<{ deleted: number }> {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - LIMITS.PAGEVIEW_RETENTION_DAYS);

    const result = await this.prisma.pageView.deleteMany({
      where: {
        createdAt: {
          lt: retentionDate,
        },
      },
    });

    return { deleted: result.count };
  }
}
