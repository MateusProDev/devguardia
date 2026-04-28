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
import { LIMITS } from '../../common/config/limits.config';

@Injectable()
export class ScansService {
  private readonly FREE_DAILY_LIMIT = LIMITS.FREE_DAILY_SCAN_LIMIT;
  private readonly FREE_VULN_LIMIT = LIMITS.FREE_VULNERABILITY_LIMIT;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly queueService: QueueService,
  ) {}

  private readonly CONSENT_TEXT =
    'Declaro, sob as penas da lei, que sou o proprietário ou possuo autorização expressa do proprietário ' +
    'do domínio/aplicação informado(a) para realizar esta análise de segurança. Estou ciente de que: ' +
    '(1) a realização de testes de segurança sem autorização pode configurar crime nos termos do Art. 154-A ' +
    'do Código Penal Brasileiro (Lei nº 12.737/2012 — Lei Carolina Dieckmann); ' +
    '(2) esta análise deve ser utilizada exclusivamente para fins legítimos de segurança da informação ' +
    'em projetos pessoais ou com autorização documentada de terceiros; ' +
    '(3) o tratamento de dados pessoais eventualmente coletados durante a análise está sujeito à ' +
    'Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD); ' +
    '(4) a DevGuard AI armazena este consentimento como registro legal e poderá apresentá-lo ' +
    'às autoridades competentes em caso de investigação. ' +
    'Assumo total responsabilidade civil e criminal pelo uso desta ferramenta.';

  async getConsentText(): Promise<string> {
    return this.CONSENT_TEXT;
  }

  async create(userId: string, dto: CreateScanDto, meta: { ip: string; userAgent: string }) {
    const { url, acceptedTerms } = dto;

    if (!acceptedTerms) {
      throw new BadRequestException('É obrigatório aceitar os termos de responsabilidade para iniciar um scan.');
    }

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

    await this.prisma.scanConsent.create({
      data: {
        userId,
        scanId: scan.id,
        targetUrl: url,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        consentText: this.CONSENT_TEXT,
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

    // Auto-fail stuck scans (QUEUED/RUNNING for more than configured minutes)
    if (
      (scan.status === 'QUEUED' || scan.status === 'RUNNING') &&
      Date.now() - scan.createdAt.getTime() > LIMITS.SCAN_EXPIRY_MINUTES * 60 * 1000
    ) {
      await this.prisma.scan.update({
        where: { id },
        data: { status: 'FAILED', errorMsg: 'Scan expirou. O worker pode estar indisponível. Tente novamente.' },
      });
      scan.status = 'FAILED';
      (scan as any).errorMsg = 'Scan expirou. O worker pode estar indisponível. Tente novamente.';
    }

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
