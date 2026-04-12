import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VulnerabilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByScan(scanId: string) {
    return this.prisma.vulnerability.findMany({
      where: { scanId },
      orderBy: { severity: 'asc' },
    });
  }
}
