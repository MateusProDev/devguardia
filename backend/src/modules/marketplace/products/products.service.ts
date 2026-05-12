import {
  Injectable, BadRequestException, NotFoundException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatorsService } from '../creators/creators.service';
import { UpsertProductDto } from './dto/upsert-product.dto';
import { UpsertModuleDto } from './dto/upsert-module.dto';
import { UpsertLessonDto } from './dto/upsert-lesson.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creatorsService: CreatorsService,
  ) {}

  /**
   * Carrega o creatorProfile do user, lança se não existir.
   * Helper para qualquer mutação de produto.
   */
  private async getCreatorOrThrow(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) {
      throw new ForbiddenException('Você precisa criar um perfil de vendedor antes de gerenciar produtos.');
    }
    if (creator.status === 'BANNED') {
      throw new ForbiddenException('Sua conta de vendedor está suspensa.');
    }
    return creator;
  }

  /** Valida que o product pertence ao creator do user. */
  private async getOwnProductOrThrow(userId: string, productId: string) {
    const creator = await this.getCreatorOrThrow(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    if (product.creatorId !== creator.id) throw new ForbiddenException('Acesso negado.');
    return { creator, product };
  }

  // ─── CRUD de Product ─────────────────────────────────────────

  async listMine(userId: string) {
    const creator = await this.getCreatorOrThrow(userId);
    return this.prisma.product.findMany({
      where: { creatorId: creator.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { modules: true, purchases: true } },
      },
    });
  }

  async create(userId: string, dto: UpsertProductDto) {
    const creator = await this.getCreatorOrThrow(userId);
    this.validatePricing(creator, dto);

    const slugTaken = await this.prisma.product.findUnique({ where: { slug: dto.slug.toLowerCase() } });
    if (slugTaken) {
      throw new ConflictException(`Slug "${dto.slug}" já está em uso.`);
    }

    return this.prisma.product.create({
      data: {
        creatorId: creator.id,
        type: dto.type,
        slug: dto.slug.toLowerCase(),
        title: dto.title,
        shortDescription: dto.shortDescription ?? null,
        description: dto.description,
        coverImageUrl: dto.coverImageUrl ?? null,
        priceXmrPiconero: dto.priceXmrPiconero ? BigInt(dto.priceXmrPiconero) : null,
        pricePixBrlCents: dto.pricePixBrlCents ?? null,
        acceptsXmr: dto.acceptsXmr,
        acceptsPix: dto.acceptsPix,
        status: 'DRAFT',
      },
    });
  }

  async update(userId: string, productId: string, dto: UpsertProductDto) {
    const { creator, product } = await this.getOwnProductOrThrow(userId, productId);
    this.validatePricing(creator, dto);

    // Se mudou slug, verifica unicidade
    if (dto.slug.toLowerCase() !== product.slug) {
      const taken = await this.prisma.product.findUnique({ where: { slug: dto.slug.toLowerCase() } });
      if (taken) throw new ConflictException(`Slug "${dto.slug}" já está em uso.`);
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        type: dto.type,
        slug: dto.slug.toLowerCase(),
        title: dto.title,
        shortDescription: dto.shortDescription ?? null,
        description: dto.description,
        coverImageUrl: dto.coverImageUrl ?? null,
        priceXmrPiconero: dto.priceXmrPiconero ? BigInt(dto.priceXmrPiconero) : null,
        pricePixBrlCents: dto.pricePixBrlCents ?? null,
        acceptsXmr: dto.acceptsXmr,
        acceptsPix: dto.acceptsPix,
      },
    });
  }

  async remove(userId: string, productId: string) {
    const { product } = await this.getOwnProductOrThrow(userId, productId);

    // Não permite deletar se já tem compras confirmadas (preserva histórico do comprador)
    const confirmedSales = await this.prisma.purchase.count({
      where: { productId: product.id, status: 'CONFIRMED' },
    });
    if (confirmedSales > 0) {
      throw new BadRequestException(
        'Este produto possui vendas confirmadas. Use "arquivar" em vez de deletar para preservar acesso dos compradores.',
      );
    }

    await this.prisma.product.delete({ where: { id: productId } });
    return { success: true };
  }

  /** Publica ou arquiva um produto. */
  async setStatus(userId: string, productId: string, publish: boolean) {
    const { creator, product } = await this.getOwnProductOrThrow(userId, productId);

    if (publish) {
      // Validações de pré-publicação
      if (!product.acceptsXmr && !product.acceptsPix) {
        throw new BadRequestException('Configure ao menos um método de pagamento no produto.');
      }
      if (product.acceptsXmr && !this.creatorsService.hasUsableXmr(creator)) {
        throw new BadRequestException(
          'Para aceitar XMR, configure seu endereço Monero no perfil de vendedor.',
        );
      }
      if (product.acceptsPix && !this.creatorsService.hasUsablePix(creator)) {
        throw new BadRequestException(
          'Para aceitar PIX, configure chave PIX, tipo e nome do beneficiário no perfil de vendedor.',
        );
      }
      if (product.acceptsXmr && !product.priceXmrPiconero) {
        throw new BadRequestException('Defina o preço em XMR.');
      }
      if (product.acceptsPix && !product.pricePixBrlCents) {
        throw new BadRequestException('Defina o preço em PIX (BRL).');
      }
      // Cursos e mentorias devem ter ao menos 1 módulo + 1 aula (cursos), ou detalhes (mentorias)
      if (product.type === 'COURSE') {
        const moduleCount = await this.prisma.module.count({ where: { productId: product.id } });
        if (moduleCount === 0) {
          throw new BadRequestException('Adicione ao menos um módulo com aulas antes de publicar o curso.');
        }
        const lessonCount = await this.prisma.lesson.count({
          where: { module: { productId: product.id } },
        });
        if (lessonCount === 0) {
          throw new BadRequestException('Adicione ao menos uma aula antes de publicar o curso.');
        }
      }
      if (product.type === 'EBOOK') {
        const ebook = await this.prisma.ebookFile.findUnique({ where: { productId: product.id } });
        if (!ebook) {
          throw new BadRequestException('Faça upload do arquivo PDF antes de publicar o ebook.');
        }
      }
      if (product.type === 'MENTORSHIP') {
        const details = await this.prisma.mentorshipDetails.findUnique({ where: { productId: product.id } });
        if (!details) {
          throw new BadRequestException('Configure os detalhes da mentoria antes de publicar.');
        }
      }
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        status: publish ? 'PUBLISHED' : 'ARCHIVED',
        publishedAt: publish ? (product.publishedAt ?? new Date()) : product.publishedAt,
      },
    });
  }

  // ─── Marketplace público ─────────────────────────────────────

  async listPublic(params: { type?: string; q?: string; limit?: number; offset?: number }) {
    const where: any = { status: 'PUBLISHED' };
    if (params.type) where.type = params.type;
    if (params.q) {
      where.OR = [
        { title: { contains: params.q, mode: 'insensitive' } },
        { shortDescription: { contains: params.q, mode: 'insensitive' } },
      ];
    }

    const limit = Math.min(params.limit ?? 20, 50);
    const offset = params.offset ?? 0;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take: limit,
        skip: offset,
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
          creator: {
            select: { slug: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  /**
   * Detalhe público de produto (usado na página de venda).
   * NÃO retorna conteúdo das aulas (storageKey, content) — só estrutura e prévia.
   */
  async getPublicBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        creator: {
          select: {
            id: true, slug: true, displayName: true, bio: true, avatarUrl: true, status: true,
          },
        },
        modules: {
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              orderBy: { position: 'asc' },
              select: {
                id: true,
                title: true,
                type: true,
                position: true,
                durationSec: true,
                isPreview: true,
                // content/storageKey omitidos
              },
            },
          },
        },
        mentorshipDetails: true,
        ebookFile: { select: { fileName: true, fileSize: true, pageCount: true } },
        _count: { select: { reviews: true } },
      },
    });

    if (!product) throw new NotFoundException('Produto não encontrado.');
    if (product.status !== 'PUBLISHED') {
      throw new NotFoundException('Produto não está publicado.');
    }

    // Rating médio
    const agg = await this.prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
    });

    return { ...product, avgRating: agg._avg.rating ?? null };
  }

  /**
   * Detalhe interno do produto para o criador (com tudo, incluindo storage keys).
   */
  async getOwnDetail(userId: string, productId: string) {
    const { product } = await this.getOwnProductOrThrow(userId, productId);
    return this.prisma.product.findUnique({
      where: { id: product.id },
      include: {
        modules: {
          orderBy: { position: 'asc' },
          include: { lessons: { orderBy: { position: 'asc' } } },
        },
        ebookFile: true,
        mentorshipDetails: true,
      },
    });
  }

  // ─── Modules ─────────────────────────────────────────────────

  async createModule(userId: string, productId: string, dto: UpsertModuleDto) {
    await this.getOwnProductOrThrow(userId, productId);
    return this.prisma.module.create({
      data: { productId, title: dto.title, position: dto.position },
    });
  }

  async updateModule(userId: string, moduleId: string, dto: UpsertModuleDto) {
    const mod = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException('Módulo não encontrado.');
    await this.getOwnProductOrThrow(userId, mod.productId);
    return this.prisma.module.update({
      where: { id: moduleId },
      data: { title: dto.title, position: dto.position },
    });
  }

  async removeModule(userId: string, moduleId: string) {
    const mod = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException('Módulo não encontrado.');
    await this.getOwnProductOrThrow(userId, mod.productId);
    await this.prisma.module.delete({ where: { id: moduleId } });
    return { success: true };
  }

  // ─── Lessons ─────────────────────────────────────────────────

  async createLesson(userId: string, moduleId: string, dto: UpsertLessonDto) {
    const mod = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException('Módulo não encontrado.');
    await this.getOwnProductOrThrow(userId, mod.productId);

    return this.prisma.lesson.create({
      data: {
        moduleId,
        title: dto.title,
        type: dto.type,
        position: dto.position,
        durationSec: dto.durationSec ?? null,
        content: dto.content ?? null,
        storageKey: dto.storageKey ?? null,
        isPreview: dto.isPreview ?? false,
      },
    });
  }

  async updateLesson(userId: string, lessonId: string, dto: UpsertLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson) throw new NotFoundException('Aula não encontrada.');
    await this.getOwnProductOrThrow(userId, lesson.module.productId);

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: dto.title,
        type: dto.type,
        position: dto.position,
        durationSec: dto.durationSec ?? null,
        content: dto.content ?? null,
        storageKey: dto.storageKey ?? null,
        isPreview: dto.isPreview ?? false,
      },
    });
  }

  async removeLesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson) throw new NotFoundException('Aula não encontrada.');
    await this.getOwnProductOrThrow(userId, lesson.module.productId);
    await this.prisma.lesson.delete({ where: { id: lessonId } });
    return { success: true };
  }

  // ─── Helpers ────────────────────────────────────────────────

  private validatePricing(
    creator: { moneroMainAddress: string | null; pixKey: string | null },
    dto: UpsertProductDto,
  ) {
    if (!dto.acceptsXmr && !dto.acceptsPix) {
      throw new BadRequestException('O produto deve aceitar pelo menos um método (XMR ou PIX).');
    }
    if (dto.acceptsXmr && !dto.priceXmrPiconero) {
      throw new BadRequestException('Defina o preço em XMR (em piconero).');
    }
    if (dto.acceptsPix && (dto.pricePixBrlCents === undefined || dto.pricePixBrlCents <= 0)) {
      throw new BadRequestException('Defina o preço em BRL (centavos > 0).');
    }
    if (dto.priceXmrPiconero) {
      const v = BigInt(dto.priceXmrPiconero);
      if (v <= 0n) throw new BadRequestException('priceXmrPiconero deve ser positivo.');
    }
  }
}
