import {
  Injectable, BadRequestException, NotFoundException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { ClaimPaymentDto } from './dto/claim-payment.dto';
import { ConfirmPurchaseDto } from './dto/confirm-purchase.dto';

const XMR_WINDOW_HOURS = Number(process.env.MONERO_PAYMENT_WINDOW_HOURS ?? '2');
const PIX_WINDOW_HOURS = Number(process.env.PIX_PAYMENT_WINDOW_HOURS ?? '24');

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria uma nova Purchase no estado AWAITING_PAYMENT.
   * Retorna instruções de pagamento (endereço XMR ou chave PIX) lidos do CreatorProfile.
   */
  async create(userId: string, dto: CreatePurchaseDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { creator: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    if (product.status !== 'PUBLISHED') {
      throw new BadRequestException('Este produto não está disponível para compra.');
    }
    if (product.creator.status === 'BANNED') {
      throw new ForbiddenException('Este vendedor está suspenso.');
    }
    if (product.creator.userId === userId) {
      throw new BadRequestException('Você não pode comprar seu próprio produto.');
    }

    // Verifica se já tem compra ativa para esse produto
    const existing = await this.prisma.purchase.findFirst({
      where: {
        userId,
        productId: product.id,
        status: { in: ['AWAITING_PAYMENT', 'PAYMENT_CLAIMED', 'CONFIRMED'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      if (existing.status === 'CONFIRMED') {
        throw new ConflictException('Você já comprou este produto.');
      }
      // Já tem compra pendente — retorna a existente em vez de duplicar
      return this.formatWithInstructions(existing, product);
    }

    // Validações específicas do método
    if (dto.method === 'XMR') {
      if (!product.acceptsXmr) throw new BadRequestException('Este produto não aceita XMR.');
      if (!product.priceXmrPiconero) throw new BadRequestException('Preço XMR não definido.');
      if (!product.creator.moneroMainAddress) {
        throw new BadRequestException('Vendedor não configurou endereço Monero.');
      }
    } else {
      if (!product.acceptsPix) throw new BadRequestException('Este produto não aceita PIX.');
      if (!product.pricePixBrlCents) throw new BadRequestException('Preço PIX não definido.');
      if (!product.creator.pixKey) {
        throw new BadRequestException('Vendedor não configurou chave PIX.');
      }
    }

    const windowHours = dto.method === 'XMR' ? XMR_WINDOW_HOURS : PIX_WINDOW_HOURS;
    const expiresAt = new Date(Date.now() + windowHours * 60 * 60 * 1000);

    const purchase = await this.prisma.purchase.create({
      data: {
        userId,
        productId: product.id,
        method: dto.method,
        status: 'AWAITING_PAYMENT',
        amountXmrPiconero: dto.method === 'XMR' ? product.priceXmrPiconero : null,
        amountPixBrlCents: dto.method === 'PIX' ? product.pricePixBrlCents : null,
        expiresAt,
      },
    });

    return this.formatWithInstructions(purchase, product);
  }

  /**
   * Retorna detalhes da compra com instruções de pagamento.
   * Lida apenas pelo comprador.
   */
  async getOwn(userId: string, purchaseId: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { product: { include: { creator: true } } },
    });
    if (!purchase) throw new NotFoundException('Compra não encontrada.');
    if (purchase.userId !== userId) throw new ForbiddenException('Acesso negado.');

    // Expirar automaticamente se passou do prazo e ainda aguardando
    if (
      purchase.status === 'AWAITING_PAYMENT' &&
      purchase.expiresAt.getTime() < Date.now()
    ) {
      await this.prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: 'EXPIRED' },
      });
      purchase.status = 'EXPIRED';
    }

    return this.formatWithInstructions(purchase, purchase.product);
  }

  /**
   * Comprador clica "Paguei" — move para PAYMENT_CLAIMED.
   * Vendedor precisa confirmar manualmente depois.
   */
  async claimPayment(userId: string, purchaseId: string, dto: ClaimPaymentDto) {
    const purchase = await this.prisma.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) throw new NotFoundException('Compra não encontrada.');
    if (purchase.userId !== userId) throw new ForbiddenException('Acesso negado.');

    if (purchase.status !== 'AWAITING_PAYMENT') {
      throw new BadRequestException(
        `Esta compra está no estado ${purchase.status} e não pode ser marcada como paga.`,
      );
    }
    if (purchase.expiresAt.getTime() < Date.now()) {
      await this.prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Esta compra expirou. Crie uma nova.');
    }

    const data: any = {
      status: 'PAYMENT_CLAIMED',
      paidAt: new Date(),
      pixClaimedAt: purchase.method === 'PIX' ? new Date() : null,
      pixBuyerNote: dto.note ?? null,
      pixProofUrl: dto.proofUrl ?? null,
    };
    if (purchase.method === 'XMR' && dto.txReference) {
      data.moneroTxHash = dto.txReference;
    }

    return this.prisma.purchase.update({
      where: { id: purchase.id },
      data,
    });
  }

  /**
   * Vendedor confirma manualmente o recebimento do pagamento.
   * Libera o acesso ao produto.
   */
  async confirmAsCreator(userId: string, purchaseId: string, dto: ConfirmPurchaseDto) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { product: { include: { creator: true } } },
    });
    if (!purchase) throw new NotFoundException('Compra não encontrada.');
    if (purchase.product.creator.userId !== userId) {
      throw new ForbiddenException('Apenas o vendedor pode confirmar esta compra.');
    }
    if (purchase.status === 'CONFIRMED') {
      return purchase; // idempotente
    }
    if (!['AWAITING_PAYMENT', 'PAYMENT_CLAIMED'].includes(purchase.status)) {
      throw new BadRequestException(`Compra em estado inválido para confirmação: ${purchase.status}`);
    }

    return this.prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        paidAt: purchase.paidAt ?? new Date(),
        pixConfirmedAt: purchase.method === 'PIX' ? new Date() : null,
        pixBuyerNote: purchase.pixBuyerNote ?? (dto.note ?? null),
      },
    });
  }

  /**
   * Vendedor ou comprador cancela a compra antes da confirmação.
   */
  async cancel(userId: string, purchaseId: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { product: { include: { creator: true } } },
    });
    if (!purchase) throw new NotFoundException('Compra não encontrada.');

    const isBuyer = purchase.userId === userId;
    const isSeller = purchase.product.creator.userId === userId;
    if (!isBuyer && !isSeller) throw new ForbiddenException('Acesso negado.');

    if (purchase.status === 'CONFIRMED') {
      throw new BadRequestException('Compra já confirmada — não pode ser cancelada (Monero/PIX são irreversíveis).');
    }
    if (['EXPIRED', 'CANCELLED'].includes(purchase.status)) {
      return purchase;
    }

    return this.prisma.purchase.update({
      where: { id: purchase.id },
      data: { status: 'CANCELLED' },
    });
  }

  /** Lista compras do usuário (como comprador). */
  async listAsBuyer(userId: string) {
    return this.prisma.purchase.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true, slug: true, type: true, title: true, coverImageUrl: true,
            creator: { select: { slug: true, displayName: true } },
          },
        },
      },
    });
  }

  /** Lista vendas do criador. */
  async listAsSeller(userId: string, status?: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException('Você não é vendedor.');

    return this.prisma.purchase.findMany({
      where: {
        product: { creatorId: creator.id },
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, slug: true, type: true, title: true } },
        user: { select: { id: true, email: true, displayName: true } },
      },
    });
  }

  /**
   * Verifica se o usuário tem acesso CONFIRMED a um produto.
   * Usado pelos endpoints de conteúdo (aulas, download de ebook).
   */
  async hasAccess(userId: string, productId: string): Promise<boolean> {
    const count = await this.prisma.purchase.count({
      where: { userId, productId, status: 'CONFIRMED' },
    });
    return count > 0;
  }

  // ─── Helpers ────────────────────────────────────────────

  private formatWithInstructions(purchase: any, product: any) {
    const creator = product.creator;
    const instructions = purchase.method === 'XMR'
      ? {
          method: 'XMR' as const,
          moneroAddress: creator?.moneroMainAddress ?? null,
          amountPiconero: purchase.amountXmrPiconero?.toString() ?? null,
          amountXmr: purchase.amountXmrPiconero
            ? (Number(purchase.amountXmrPiconero) / 1e12).toFixed(12)
            : null,
        }
      : {
          method: 'PIX' as const,
          pixKey: creator?.pixKey ?? null,
          pixKeyType: creator?.pixKeyType ?? null,
          pixHolderName: creator?.pixHolderName ?? null,
          pixQrCodeUrl: creator?.pixQrCodeUrl ?? null,
          amountBrlCents: purchase.amountPixBrlCents ?? null,
          amountBrl: purchase.amountPixBrlCents
            ? (purchase.amountPixBrlCents / 100).toFixed(2)
            : null,
        };

    return {
      id: purchase.id,
      status: purchase.status,
      method: purchase.method,
      expiresAt: purchase.expiresAt,
      paidAt: purchase.paidAt,
      confirmedAt: purchase.confirmedAt,
      // Snapshot dos preços (BigInt → string)
      amountXmrPiconero: purchase.amountXmrPiconero?.toString() ?? null,
      amountPixBrlCents: purchase.amountPixBrlCents,
      instructions,
    };
  }
}
