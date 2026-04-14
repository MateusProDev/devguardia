import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto, PaymentType } from './dto/create-payment.dto';
import { CreatePixPaymentDto } from './dto/create-pix-payment.dto';
import * as crypto from 'crypto';

const SINGLE_SCAN_PRICE = parseInt(process.env.SINGLE_SCAN_PRICE || '990');
const SUBSCRIPTION_PRICE = parseInt(process.env.SUBSCRIPTION_PRICE || '1990');
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
const API_BASE = 'https://api.mercadopago.com';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  getPublicKey() {
    const key = process.env.MERCADOPAGO_PUBLIC_KEY || '';
    if (!key) throw new BadRequestException('Chave pública não configurada.');
    return { publicKey: key };
  }

  async processCardPayment(userId: string, dto: CreatePaymentDto) {
    const amount =
      dto.type === PaymentType.SINGLE_SCAN ? SINGLE_SCAN_PRICE : SUBSCRIPTION_PRICE;
    const description =
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
      transaction_amount: amount / 100,
      token: dto.token,
      description,
      installments: dto.installments,
      payment_method_id: dto.paymentMethodId,
      issuer_id: dto.issuerId || undefined,
      payer: {
        email: dto.email,
      },
      external_reference: payment.id,
      notification_url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/payment/webhook`,
      statement_descriptor: 'DEVGUARDAI',
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/v1/payments`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          'X-Idempotency-Key': payment.id,
        },
        body: JSON.stringify(body),
      });
    } finally {
      clearTimeout(timeout);
    }

    const mpResponse = await response.json();

    if (!response.ok) {
      this.logger.error(`MercadoPago error: ${JSON.stringify(mpResponse)}`);
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REJECTED' },
      });

      const userMessage = this.getErrorMessage(mpResponse);
      throw new BadRequestException(userMessage);
    }

    const status = this.mapStatus(mpResponse.status);

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        mercadoPagoId: String(mpResponse.id),
        status,
      },
    });

    if (status === 'APPROVED') {
      await this.activatePurchase(payment);
    }

    return {
      paymentId: payment.id,
      status,
      statusDetail: mpResponse.status_detail,
      mercadoPagoId: mpResponse.id,
    };
  }

  async processPixPayment(userId: string, dto: CreatePixPaymentDto) {
    const amount =
      dto.type === PaymentType.SINGLE_SCAN ? SINGLE_SCAN_PRICE : SUBSCRIPTION_PRICE;
    const description =
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
      transaction_amount: amount / 100,
      description,
      payment_method_id: 'pix',
      payer: {
        email: dto.email,
        first_name: 'DevGuard',
        last_name: 'User',
        identification: {
          type: 'CPF',
          number: dto.cpf,
        },
      },
      external_reference: payment.id,
      notification_url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/payment/webhook`,
      statement_descriptor: 'DEVGUARDAI',
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/v1/payments`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          'X-Idempotency-Key': payment.id,
        },
        body: JSON.stringify(body),
      });
    } finally {
      clearTimeout(timeout);
    }

    const mpResponse = await response.json();

    if (!response.ok) {
      this.logger.error(`MercadoPago PIX error: ${JSON.stringify(mpResponse)}`);
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REJECTED' },
      });
      throw new BadRequestException('Erro ao gerar PIX. Tente novamente.');
    }

    const status = this.mapStatus(mpResponse.status);

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        mercadoPagoId: String(mpResponse.id),
        status,
      },
    });

    if (status === 'APPROVED') {
      await this.activatePurchase(payment);
    }

    const pixData = mpResponse.point_of_interaction?.transaction_data;

    return {
      paymentId: payment.id,
      status,
      mercadoPagoId: mpResponse.id,
      qrCode: pixData?.qr_code || '',
      qrCodeBase64: pixData?.qr_code_base64 || '',
      ticketUrl: pixData?.ticket_url || '',
      expiresAt: mpResponse.date_of_expiration || null,
    };
  }

  async checkPaymentStatus(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) throw new NotFoundException('Pagamento não encontrado.');
    if (payment.userId !== userId) throw new ForbiddenException('Acesso negado.');

    if (payment.status === 'PENDING' && payment.mercadoPagoId) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(`${API_BASE}/v1/payments/${payment.mercadoPagoId}`, {
          headers: { Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` },
          signal: controller.signal,
        });

        if (response.ok) {
          const mpPayment = await response.json();
          const newStatus = this.mapStatus(mpPayment.status);

          if (newStatus !== payment.status) {
            await this.prisma.payment.update({
              where: { id: paymentId },
              data: { status: newStatus },
            });

            if (newStatus === 'APPROVED') {
              await this.activatePurchase(payment);
            }

            return { status: newStatus };
          }
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    return { status: payment.status };
  }

  async getInstallments(amount: number, bin: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const url = new URL(`${API_BASE}/v1/payment_methods/installments`);
      url.searchParams.set('amount', String(amount / 100));
      url.searchParams.set('bin', bin);
      url.searchParams.set('processing_mode', 'aggregator');

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` },
        signal: controller.signal,
      });

      if (!response.ok) {
        return [];
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
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

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/v1/payments/${mpPaymentId}`, {
        headers: { Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

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

    const status = this.mapStatus(mpPayment.status);

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { mercadoPagoId: String(mpPaymentId), status },
    });

    if (status === 'APPROVED') {
      await this.activatePurchase(payment);
    }
  }

  private mapStatus(mpStatus: string): 'APPROVED' | 'REJECTED' | 'PENDING' {
    if (mpStatus === 'approved') return 'APPROVED';
    if (mpStatus === 'rejected') return 'REJECTED';
    return 'PENDING';
  }

  private async activatePurchase(payment: { id: string; type: string; scanId: string | null; userId: string }) {
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

  private getErrorMessage(mpResponse: any): string {
    const cause = mpResponse?.cause?.[0]?.code;
    const errorMessages: Record<string, string> = {
      'cc_rejected_bad_filled_card_number': 'Número do cartão inválido.',
      'cc_rejected_bad_filled_date': 'Data de validade inválida.',
      'cc_rejected_bad_filled_other': 'Dados do cartão incorretos.',
      'cc_rejected_bad_filled_security_code': 'Código de segurança inválido.',
      'cc_rejected_blacklist': 'Pagamento não autorizado.',
      'cc_rejected_call_for_authorize': 'Entre em contato com sua operadora de cartão.',
      'cc_rejected_card_disabled': 'Cartão desabilitado. Ative-o junto à operadora.',
      'cc_rejected_duplicated_payment': 'Pagamento duplicado. Já existe uma cobrança.',
      'cc_rejected_high_risk': 'Pagamento recusado por risco de fraude.',
      'cc_rejected_insufficient_amount': 'Saldo insuficiente.',
      'cc_rejected_max_attempts': 'Limite de tentativas atingido. Use outro cartão.',
      'cc_rejected_other_reason': 'Pagamento recusado pela operadora.',
    };

    const statusDetail = mpResponse?.status_detail;
    if (statusDetail && errorMessages[statusDetail]) {
      return errorMessages[statusDetail];
    }

    if (cause) {
      return `Erro no pagamento (código: ${cause}).`;
    }

    return 'Erro ao processar pagamento. Verifique os dados e tente novamente.';
  }
}
