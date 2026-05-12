import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpsertCreatorDto } from './dto/upsert-creator.dto';
import { PaymentConfigDto } from './dto/payment-config.dto';

@Injectable()
export class CreatorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria ou atualiza o perfil de criador do usuário.
   * Cada User tem no máximo 1 CreatorProfile (1:1).
   */
  async upsertOwnProfile(userId: string, dto: UpsertCreatorDto) {
    if (!dto.acceptedMarketplaceTerms) {
      throw new BadRequestException(
        'É obrigatório aceitar os termos do marketplace para criar/atualizar perfil de vendedor.',
      );
    }

    // Slug único — validar manualmente para mensagem clara
    const existing = await this.prisma.creatorProfile.findUnique({ where: { slug: dto.slug } });
    if (existing && existing.userId !== userId) {
      throw new ConflictException(`Slug "${dto.slug}" já está em uso. Escolha outro.`);
    }

    const data = {
      slug: dto.slug.toLowerCase(),
      displayName: dto.displayName,
      bio: dto.bio ?? null,
      avatarUrl: dto.avatarUrl ?? null,
      acceptedMarketplaceTerms: true,
      acceptedMarketplaceTermsAt: new Date(),
    };

    return this.prisma.creatorProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async getOwnProfile(userId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      include: {
        _count: { select: { products: true } },
      },
    });
    return profile;
  }

  /** Atualiza configuração de pagamento (XMR e/ou PIX). */
  async updatePaymentConfig(userId: string, dto: PaymentConfigDto) {
    const profile = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Perfil de criador não encontrado. Crie o perfil antes de configurar pagamento.');
    }

    // Validação cruzada: se tem PIX key, precisa também de tipo + nome do beneficiário
    if (dto.pixKey || dto.pixKeyType || dto.pixHolderName) {
      if (!dto.pixKey || !dto.pixKeyType || !dto.pixHolderName) {
        throw new BadRequestException(
          'Para configurar PIX, é necessário preencher: chave PIX, tipo da chave e nome do beneficiário.',
        );
      }
    }

    return this.prisma.creatorProfile.update({
      where: { userId },
      data: {
        moneroMainAddress: dto.moneroMainAddress ?? null,
        moneroViewKey: dto.moneroViewKey ?? null,
        pixKey: dto.pixKey ?? null,
        pixKeyType: dto.pixKeyType ?? null,
        pixHolderName: dto.pixHolderName ?? null,
        pixQrCodeUrl: dto.pixQrCodeUrl ?? null,
      },
    });
  }

  /**
   * Resumo público de um criador (para a página /@slug).
   * NÃO retorna view-key, retorna apenas o que é público.
   */
  async getPublicBySlug(slug: string) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { slug: slug.toLowerCase() },
      select: {
        id: true,
        slug: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
        products: {
          where: { status: 'PUBLISHED' },
          select: {
            id: true,
            slug: true,
            type: true,
            title: true,
            shortDescription: true,
            coverImageUrl: true,
            priceXmrPiconero: true,
            pricePixBrlCents: true,
            acceptsXmr: true,
            acceptsPix: true,
            publishedAt: true,
          },
          orderBy: { publishedAt: 'desc' },
        },
      },
    });

    if (!profile) throw new NotFoundException('Criador não encontrado.');
    if (profile.status === 'BANNED') throw new ForbiddenException('Este criador não está disponível.');

    return profile;
  }

  /**
   * Verifica se o criador tem ao menos um método de pagamento configurado completamente.
   * Usado antes de permitir publicar produtos.
   */
  hasUsableXmr(profile: { moneroMainAddress: string | null }): boolean {
    return !!profile.moneroMainAddress;
  }

  hasUsablePix(profile: {
    pixKey: string | null;
    pixKeyType: any;
    pixHolderName: string | null;
  }): boolean {
    return !!(profile.pixKey && profile.pixKeyType && profile.pixHolderName);
  }
}
