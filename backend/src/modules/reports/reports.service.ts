import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async getReport(scanId: string, userId: string) {
    const scan = await this.prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        vulnerabilities: {
          orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }],
        },
        payments: {
          where: { status: 'APPROVED' },
          take: 1,
        },
      },
    });

    if (!scan) throw new NotFoundException('Relatório não encontrado.');
    if (scan.userId !== userId) throw new ForbiddenException('Acesso negado.');

    const hasSub = await this.usersService.hasActiveSubscription(userId);
    const isPaid = scan.payments.length > 0;
    const isUnlocked = hasSub || isPaid || scan.isPremium;

    const counts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };
    scan.vulnerabilities.forEach((v) => {
      counts[v.severity]++;
    });

    if (isUnlocked) {
      return {
        id: scan.id,
        url: scan.url,
        status: scan.status,
        score: scan.score,
        isPremium: scan.isPremium,
        createdAt: scan.createdAt,
        isLimited: false,
        summary: counts,
        vulnerabilities: scan.vulnerabilities,
      };
    }

    return {
      id: scan.id,
      url: scan.url,
      status: scan.status,
      score: scan.score,
      isPremium: scan.isPremium,
      createdAt: scan.createdAt,
      isLimited: true,
      summary: counts,
      vulnerabilities: [],
    };
  }
}
