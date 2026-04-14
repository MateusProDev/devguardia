import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto, PaymentType } from './dto/create-payment.dto';
import * as crypto from 'crypto';

const SINGLE_SCAN_PRICE = parseInt(process.env.SINGLE_SCAN_PRICE || '990');
const SUBSCRIPTION_PRICE = parseInt(process.env.SUBSCRIPTION_PRICE || '1990');
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
const API_BASE = 'https://api.mercadopago.com';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPreference(userId: string, dto: CreatePaymentDto) {
    const amount =
      dto.type === PaymentType.SINGLE_SCAN ? SINGLE_SCAN_PRICE : SUBSCRIPTION_PRICE;
    const title =
      dto.type === PaymentType.SINGLE_SCAN
        ? 'DevGuard AI - Relatório Completo'
        : 'DevGuard AI - Assinatura Mensal';

    if (dto.type === PaymentType.SINGLE_SCAN) {
      if (!dto.scanId) throw new BadRequestException('scanId é obrigatório para scan avulso.');
      const scan = await this.prisma.scan.findUnique({ where: { id: dto.scanId } });
      if (!scan) throw new NotFoundException('Scan não encontrado.');
      if (scan.userId !== userId) throw new ForbiddenException('Acesso negado.');
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        scanId: dto.scanId || null,
        type: dto.type,
        amount,
        status: 'PENDING',
      },
    });

    const body = {
      items: [
        {
          id: payment.id,
          title,
          quantity: 1,
          unit_price: amount / 100,
          currency_id: 'BRL',
        },
      ],
      external_reference: payment.id,
      notification_url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/payment/webhook`,
      back_urls: {
        success: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?payment=success`,
        failure: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?payment=failure`,
        pending: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?payment=pending`,
      },
      auto_return: 'approved',
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(`${API_BASE}/checkout/preferences`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.text();
      this.logger.error(`MercadoPago error: ${err}`);
      throw new BadRequestException('Erro ao criar preferência de pagamento.');
    }

    const preference = await response.json();

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { preferenceId: preference.id },
    });

    return {
      preferenceId: preference.id,
      checkoutUrl: preference.init_point,
      sandboxUrl: preference.sandbox_init_point,
    };
  }

  async handleWebhook(body: any, signature: string) {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || '';

    if (!secret) {
      this.logger.error('MERCADOPAGO_WEBHOOK_SECRET not configured — rejecting webhook');
      throw new BadRequestException('Webhook authentication not configured');
    }

    const hash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');
    const sig = signature || '';
    if (hash.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(sig))) {
      this.logger.warn('Invalid webhook signature');
      return { received: false };
    }

    const { type, data } = body;

    if (type === 'payment' && data?.id) {
      await this.processPaymentNotification(data.id);
    }

    return { received: true };
  }

  private async processPaymentNotification(mpPaymentId: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(`${API_BASE}/v1/payments/${mpPaymentId}`, {
      headers: { Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      this.logger.error(`Failed to fetch MP payment ${mpPaymentId}`);
      return;
    }

    const mpPayment = await response.json();
    const paymentId = mpPayment.external_reference;

    if (!paymentId) return;

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) return;

    const status =
      mpPayment.status === 'approved'
        ? 'APPROVED'
        : mpPayment.status === 'rejected'
          ? 'REJECTED'
          : 'PENDING';

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { mercadoPagoId: String(mpPaymentId), status },
    });

    if (status === 'APPROVED') {
      if (payment.type === 'SINGLE_SCAN' && payment.scanId) {
        await this.prisma.scan.update({
          where: { id: payment.scanId },
          data: { isPremium: true },
        });
      } else if (payment.type === 'SUBSCRIPTION') {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await this.prisma.subscription.upsert({
          where: { userId: payment.userId },
          update: { active: true, expiresAt },
          create: { userId: payment.userId, active: true, expiresAt },
        });
      }
    }
  }
}
