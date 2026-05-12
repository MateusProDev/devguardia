import {
  Injectable, BadRequestException, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpsertReviewDto } from './dto/upsert-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cria ou atualiza review. Apenas compradores com purchase CONFIRMED podem avaliar. */
  async upsert(userId: string, productId: string, dto: UpsertReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produto não encontrado.');

    const hasPurchase = await this.prisma.purchase.count({
      where: { userId, productId, status: 'CONFIRMED' },
    });
    if (hasPurchase === 0) {
      throw new ForbiddenException('Apenas compradores podem avaliar este produto.');
    }

    return this.prisma.review.upsert({
      where: { productId_userId: { productId, userId } },
      create: { productId, userId, rating: dto.rating, comment: dto.comment ?? null },
      update: { rating: dto.rating, comment: dto.comment ?? null },
    });
  }

  async listByProduct(productId: string, limit = 20, offset = 0) {
    const [items, total, agg] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 50),
        skip: offset,
        include: { user: { select: { displayName: true } } },
      }),
      this.prisma.review.count({ where: { productId } }),
      this.prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
      }),
    ]);
    return { items, total, avgRating: agg._avg.rating ?? null, limit, offset };
  }

  async remove(userId: string, productId: string) {
    const review = await this.prisma.review.findUnique({
      where: { productId_userId: { productId, userId } },
    });
    if (!review) throw new NotFoundException('Avaliação não encontrada.');
    await this.prisma.review.delete({ where: { id: review.id } });
    return { success: true };
  }
}
