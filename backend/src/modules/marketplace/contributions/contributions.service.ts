import {
  Injectable, BadRequestException, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ContributionTier, PaymentMethod } from '@prisma/client';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { ClaimContributionDto } from './dto/claim-contribution.dto';

const PIX_WINDOW_HOURS = Number(process.env.PIX_PAYMENT_WINDOW_HOURS ?? '24');
const XMR_WINDOW_HOURS = Number(process.env.MONERO_PAYMENT_WINDOW_HOURS ?? '2');

const TIER_BRL_CENTS: Record<ContributionTier, number> = {
  TIER_10: 1000,
  TIER_20: 2000,
  TIER_30: 3000,
  TIER_50: 5000,
};

/**
 * Cotação fixa BRL→XMR para o tier (atualizar periodicamente).
 * Em produção, isso pode vir de uma cotação dinâmica (Kraken API etc).
 * Por enquanto, valores aproximados: 1 XMR ≈ R$ 1.000 → tiers em piconero.
 */
const TIER_XMR_PICONERO: Record<ContributionTier, bigint> = {
  TIER_10: 10_000_000_000n,  // 0.01 XMR
  TIER_20: 20_000_000_000n,  // 0.02 XMR
  TIER_30: 30_000_000_000n,  // 0.03 XMR
  TIER_50: 50_000_000_000n,  // 0.05 XMR
};

@Injectable()
export class ContributionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vendedor inicia contribuição mensal voluntária para a plataforma.
   * Retorna instruções de pagamento (endereço/chave da PLATAFORMA, vindo de env).
   */
  async create(userId: string, dto: CreateContributionDto) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) {
      throw new ForbiddenException('Apenas vendedores podem fazer contribuição.');
    }

    // Verifica se já tem contribuição PENDING desse vendedor
    const pending = await this.prisma.contribution.findFirst({
      where: { creatorId: creator.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (pending) {
      return this.formatWithInstructions(pending);
    }

    // Validação de configuração da plataforma
    if (dto.method === 'XMR' && !process.env.PLATFORM_MONERO_MAIN_ADDRESS) {
      throw new BadRequestException('Pagamento XMR para a plataforma temporariamente indisponível.');
    }
    if (dto.method === 'PIX' && !process.env.PLATFORM_PIX_KEY) {
      throw new BadRequestException('Pagamento PIX para a plataforma temporariamente indisponível.');
    }

    const windowHours = dto.method === 'XMR' ? XMR_WINDOW_HOURS : PIX_WINDOW_HOURS;
    const periodStart = new Date();
    const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(Date.now() + windowHours * 60 * 60 * 1000);

    const contribution = await this.prisma.contribution.create({
      data: {
        creatorId: creator.id,
        tier: dto.tier,
        method: dto.method,
        status: 'PENDING',
        amountBrlCents: dto.method === 'PIX' ? TIER_BRL_CENTS[dto.tier] : null,
        amountXmrPiconero: dto.method === 'XMR' ? TIER_XMR_PICONERO[dto.tier] : null,
        periodStart,
        periodEnd,
      },
    });

    return this.formatWithInstructions(contribution, expiresAt);
  }

  /** Vendedor lista suas contribuições (histórico). */
  async listMine(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) return [];
    return this.prisma.contribution.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Status atual de supporter do vendedor. */
  async getCurrentStatus(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) return { isSupporter: false, tier: null, expiresAt: null };

    const active = await this.prisma.contribution.findFirst({
      where: {
        creatorId: creator.id,
        status: 'ACTIVE',
        periodEnd: { gt: new Date() },
      },
      orderBy: { periodEnd: 'desc' },
    });

    if (!active) return { isSupporter: false, tier: null, expiresAt: null };
    return {
      isSupporter: true,
      tier: active.tier,
      expiresAt: active.periodEnd,
      method: active.method,
    };
  }

  /** Vendedor clamou que pagou — status passa de PENDING para PENDING (com claim flag). */
  async claim(userId: string, contributionId: string, dto: ClaimContributionDto) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
      include: { creator: true },
    });
    if (!contribution) throw new NotFoundException('Contribuição não encontrada.');
    if (contribution.creator.userId !== userId) throw new ForbiddenException('Acesso negado.');
    if (contribution.status !== 'PENDING') {
      throw new BadRequestException(`Contribuição em estado ${contribution.status} — não pode clamar.`);
    }

    return this.prisma.contribution.update({
      where: { id: contributionId },
      data: {
        pixClaimedAt: contribution.method === 'PIX' ? new Date() : undefined,
        moneroTxHash: contribution.method === 'XMR' ? (dto.txReference ?? null) : null,
        pixProofUrl: dto.proofUrl ?? null,
      },
    });
  }

  /**
   * Admin (você, owner da plataforma) confirma o recebimento.
   * Marca como ACTIVE.
   */
  async adminConfirm(contributionId: string, adminNote?: string) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
    });
    if (!contribution) throw new NotFoundException('Contribuição não encontrada.');
    if (contribution.status === 'ACTIVE') return contribution; // idempotente
    if (!['PENDING'].includes(contribution.status)) {
      throw new BadRequestException(`Contribuição em estado ${contribution.status} — não pode confirmar.`);
    }

    return this.prisma.contribution.update({
      where: { id: contributionId },
      data: {
        status: 'ACTIVE',
        pixConfirmedAt: contribution.method === 'PIX' ? new Date() : undefined,
        adminNote: adminNote ?? null,
      },
    });
  }

  /** Admin lista todas as contribuições pendentes para confirmar. */
  async adminListPending() {
    return this.prisma.contribution.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { slug: true, displayName: true, user: { select: { email: true } } } },
      },
    });
  }

  // ─── Helpers ────────────────────────────────────────────

  private formatWithInstructions(contribution: any, expiresAt?: Date) {
    const instructions = contribution.method === 'XMR'
      ? {
          method: 'XMR' as const,
          moneroAddress: process.env.PLATFORM_MONERO_MAIN_ADDRESS ?? null,
          amountPiconero: contribution.amountXmrPiconero?.toString() ?? null,
          amountXmr: contribution.amountXmrPiconero
            ? (Number(contribution.amountXmrPiconero) / 1e12).toFixed(12)
            : null,
        }
      : {
          method: 'PIX' as const,
          pixKey: process.env.PLATFORM_PIX_KEY ?? null,
          pixKeyType: process.env.PLATFORM_PIX_KEY_TYPE ?? null,
          pixHolderName: process.env.PLATFORM_PIX_HOLDER_NAME ?? null,
          amountBrlCents: contribution.amountBrlCents ?? null,
          amountBrl: contribution.amountBrlCents
            ? (contribution.amountBrlCents / 100).toFixed(2)
            : null,
        };

    return {
      id: contribution.id,
      tier: contribution.tier,
      method: contribution.method,
      status: contribution.status,
      periodStart: contribution.periodStart,
      periodEnd: contribution.periodEnd,
      expiresAt: expiresAt ?? null,
      amountXmrPiconero: contribution.amountXmrPiconero?.toString() ?? null,
      amountBrlCents: contribution.amountBrlCents,
      instructions,
    };
  }
}
