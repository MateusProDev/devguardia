import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Logger } from '../../common/utils/logger';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto, PaymentType } from './dto/create-payment.dto';
import { CreatePixPaymentDto } from './dto/create-pix-payment.dto';
import * as crypto from 'crypto';
import { PRICING, LIMITS, PLAN_LIMITS } from '../../common/config/limits.config';
import { isValidCPF } from '../../common/utils/cpf-validator';

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

  private getPriceForType(type: PaymentType): number {
    switch (type) {
      case PaymentType.SINGLE_SCAN: return PRICING.SINGLE_SCAN_PRICE;
      case PaymentType.SUBSCRIPTION_STARTER: return PRICING.STARTER_PRICE;
      case PaymentType.SUBSCRIPTION_PRO: return PRICING.PRO_PRICE;
      case PaymentType.SUBSCRIPTION_ENTERPRISE: return PRICING.ENTERPRISE_PRICE;
      default: throw new BadRequestException('Tipo de plano inválido.');
    }
  }

  private getDescriptionForType(type: PaymentType): string {
    switch (type) {
      case PaymentType.SINGLE_SCAN: return 'DevGuard AI - Relatório Completo';
      case PaymentType.SUBSCRIPTION_STARTER: return 'DevGuard AI - Plano Starter (Mensal)';
      case PaymentType.SUBSCRIPTION_PRO: return 'DevGuard AI - Plano Pro (Mensal)';
      case PaymentType.SUBSCRIPTION_ENTERPRISE: return 'DevGuard AI - Plano Enterprise (Mensal)';
      default: return 'DevGuard AI - Pagamento';
    }
  }

  private isSubscriptionType(type: PaymentType): boolean {
    return [
      PaymentType.SUBSCRIPTION_STARTER,
      PaymentType.SUBSCRIPTION_PRO,
      PaymentType.SUBSCRIPTION_ENTERPRISE,
    ].includes(type);
  }

  private getPlanFromType(type: PaymentType): 'STARTER' | 'PRO' | 'ENTERPRISE' {
    switch (type) {
      case PaymentType.SUBSCRIPTION_STARTER: return 'STARTER';
      case PaymentType.SUBSCRIPTION_PRO: return 'PRO';
      case PaymentType.SUBSCRIPTION_ENTERPRISE: return 'ENTERPRISE';
      default: throw new BadRequestException('Tipo não é assinatura.');
    }
  }

  async processCardPayment(userId: string, dto: CreatePaymentDto) {
    const amount = this.getPriceForType(dto.type);
    const description = this.getDescriptionForType(dto.type);

    if (dto.type === PaymentType.SINGLE_SCAN) {
      if (!dto.scanId) throw new BadRequestException('scanId é obrigatório para scan avulso.');
      const scan = await this.prisma.scan.findUnique({ where: { id: dto.scanId } });
      if (!scan) throw new NotFoundException('Scan não encontrado.');
      if (scan.userId !== userId) throw new ForbiddenException('Acesso negado.');
    }

    if (amount <= 0) {
      throw new BadRequestException('Este plano requer contato comercial.');
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
      notification_url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/payment/webhook?source_news=webhooks`,
      statement_descriptor: 'DEVGUARDIA',
      binary_mode: true,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LIMITS.MERCADOPAGO_TIMEOUT_MS);

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
    // Validar CPF
    if (!isValidCPF(dto.cpf)) {
      throw new BadRequestException('CPF inválido');
    }

    const amount = this.getPriceForType(dto.type);
    const description = this.getDescriptionForType(dto.type);

    if (dto.type === PaymentType.SINGLE_SCAN) {
      if (!dto.scanId) throw new BadRequestException('scanId é obrigatório para scan avulso.');
      const scan = await this.prisma.scan.findUnique({ where: { id: dto.scanId } });
      if (!scan) throw new NotFoundException('Scan não encontrado.');
      if (scan.userId !== userId) throw new ForbiddenException('Acesso negado.');
    }

    if (amount <= 0) {
      throw new BadRequestException('Este plano requer contato comercial.');
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
      notification_url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/payment/webhook?source_news=webhooks`,
      statement_descriptor: 'DEVGUARDIA',
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LIMITS.MERCADOPAGO_TIMEOUT_MS);

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
      const timeout = setTimeout(() => controller.abort(), LIMITS.MERCADOPAGO_STATUS_TIMEOUT_MS);

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
    const cleanBin = (bin || '').replace(/\D/g, '');
    if (cleanBin.length < 6 || cleanBin.length > 8) {
      throw new BadRequestException('BIN inválido.');
    }
    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException('Valor inválido.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const url = new URL(`${API_BASE}/v1/payment_methods/installments`);
      url.searchParams.set('amount', String(amount / 100));
      url.searchParams.set('bin', cleanBin);
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

  async handleWebhook(
    body: any,
    query: Record<string, string>,
    xSignature: string,
    xRequestId: string,
  ) {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || '';

    if (!secret) {
      this.logger.error('MERCADOPAGO_WEBHOOK_SECRET not configured — rejecting webhook');
      throw new BadRequestException('Webhook authentication not configured');
    }

    // ── Validate x-signature per Mercado Pago docs ──
    // Format: ts=TIMESTAMP,v1=HASH
    const sigParts: Record<string, string> = {};
    (xSignature || '').split(',').forEach((part) => {
      const [key, ...rest] = part.split('=');
      if (key && rest.length) {
        sigParts[key.trim()] = rest.join('=').trim();
      }
    });

    const ts = sigParts['ts'];
    const v1 = sigParts['v1'];

    if (!ts || !v1) {
      this.logger.warn('Webhook missing ts or v1 in x-signature');
      return { received: false };
    }

    // Reject if timestamp is older than 5 minutes (replay attack protection)
    const tsMs = parseInt(ts, 10) * 1000;
    if (isNaN(tsMs) || Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) {
      this.logger.warn(`Webhook timestamp too old or invalid: ${ts}`);
      return { received: false };
    }

    // Build manifest string per MP docs:
    // id:[data.id_query];request-id:[x-request-id_header];ts:[ts_header];
    const dataId = query['data.id'] || '';
    const manifestParts: string[] = [];
    if (dataId) manifestParts.push(`id:${dataId}`);
    if (xRequestId) manifestParts.push(`request-id:${xRequestId}`);
    if (ts) manifestParts.push(`ts:${ts}`);
    const manifest = manifestParts.join(';') + ';';

    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    // Timing-safe comparison
    if (
      expectedHash.length !== v1.length ||
      !crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(v1, 'hex'))
    ) {
      this.logger.warn('Invalid webhook signature');
      return { received: false };
    }

    // ── Process notification ──
    const { type, data } = body;

    if (type === 'payment' && data?.id) {
      // Sanitize: data.id must be numeric
      const mpId = String(data.id).replace(/\D/g, '');
      if (mpId) {
        await this.processPaymentNotification(mpId);
      }
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
    } else if (this.isSubscriptionType(payment.type as PaymentType)) {
      const plan = this.getPlanFromType(payment.type as PaymentType);

      // Verificar se já existe assinatura para este usuário
      const existingSubscription = await this.prisma.subscription.findUnique({
        where: { userId: payment.userId },
      });

      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + PRICING.SUBSCRIPTION_DURATION_DAYS);

      if (existingSubscription && existingSubscription.active) {
        // Renovação ou upgrade
        const isUpgrade = this.planRank(plan) > this.planRank(existingSubscription.plan as any);
        const extendedExpiresAt = new Date(isUpgrade ? new Date() : existingSubscription.expiresAt);
        extendedExpiresAt.setDate(extendedExpiresAt.getDate() + PRICING.SUBSCRIPTION_DURATION_DAYS);

        await this.prisma.subscription.update({
          where: { userId: payment.userId },
          data: { plan, expiresAt: extendedExpiresAt },
        });

        this.logger.log(`Subscription ${isUpgrade ? 'upgraded' : 'renewed'} for user ${payment.userId} to ${plan} until ${extendedExpiresAt.toISOString()}`);
      } else {
        // Nova assinatura ou reativação
        await this.prisma.subscription.upsert({
          where: { userId: payment.userId },
          update: { active: true, plan, expiresAt: newExpiresAt },
          create: { userId: payment.userId, active: true, plan, expiresAt: newExpiresAt },
        });

        this.logger.log(`Subscription activated for user ${payment.userId} plan ${plan} until ${newExpiresAt.toISOString()}`);
      }
    }
  }

  private planRank(plan: 'STARTER' | 'PRO' | 'ENTERPRISE'): number {
    const ranks = { STARTER: 1, PRO: 2, ENTERPRISE: 3 };
    return ranks[plan] || 0;
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
