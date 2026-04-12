import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { QueueService } from '../queue/queue.service';
import { CreateScanDto } from './dto/create-scan.dto';
import { isPrivateIP } from '../../common/utils/ip-validator';
import { isValidScanUrl } from '../../common/utils/url-validator';

@Injectable()
export class ScansService {
  private readonly FREE_DAILY_LIMIT = 1;
  private readonly FREE_VULN_LIMIT = 2;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly queueService: QueueService,
  ) {}

  async create(userId: string, dto: CreateScanDto) {
    const { url } = dto;

    if (!isValidScanUrl(url)) {
      throw new BadRequestException('URL inválida ou não permitida.');
    }

    const parsedUrl = new URL(url);
    if (await isPrivateIP(parsedUrl.hostname)) {
      throw new BadRequestException('Escaneamento de IPs internos não é permitido.');
    }

    const hasSub = await this.usersService.hasActiveSubscription(userId);
    if (!hasSub) {
      const scansToday = await this.usersService.getScansToday(userId);
      if (scansToday >= this.FREE_DAILY_LIMIT) {
        throw new ForbiddenException(
          'Limite diário de scans gratuitos atingido. Assine para scans ilimitados.',
        );
      }
    }

    const scan = await this.prisma.scan.create({
      data: {
        userId,
        url,
        status: 'QUEUED',
        isPremium: hasSub,
      },
    });

    await this.queueService.addScanJob(scan.id);

    return scan;
  }

  async findOne(id: string, userId: string) {
    const scan = await this.prisma.scan.findUnique({
      where: { id },
      include: {
        vulnerabilities: {
          orderBy: { severity: 'asc' },
        },
      },
    });

    if (!scan) throw new NotFoundException('Scan não encontrado.');
    if (scan.userId !== userId) throw new ForbiddenException('Acesso negado.');

    const hasSub = await this.usersService.hasActiveSubscription(userId);
    const isPremiumUnlocked = scan.isPremium || hasSub;

    if (isPremiumUnlocked) {
      return scan;
    }

    return {
      ...scan,
      vulnerabilities: scan.vulnerabilities
        .filter((v) => v.isPublic)
        .slice(0, this.FREE_VULN_LIMIT)
        .map((v) => ({
          ...v,
          aiExplanation: null,
          aiCodeFix: null,
        })),
      isLimited: true,
    };
  }

  async findByUser(userId: string) {
    return this.prisma.scan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        status: true,
        score: true,
        isPremium: true,
        createdAt: true,
      },
      take: 20,
    });
  }
}
