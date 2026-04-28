import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreatePixPaymentDto } from './dto/create-pix-payment.dto';

@Controller('payment')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('public-key')
  getPublicKey() {
    return this.paymentsService.getPublicKey();
  }

  @Post('process')
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ short: { ttl: 10000, limit: 3 } })
  async processPayment(@Req() req: any, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.processCardPayment(req.user.id, dto);
  }

  @Post('pix')
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ short: { ttl: 10000, limit: 3 } })
  async processPixPayment(@Req() req: any, @Body() dto: CreatePixPaymentDto) {
    return this.paymentsService.processPixPayment(req.user.id, dto);
  }

  @Get('status/:id')
  @UseGuards(FirebaseAuthGuard)
  async checkStatus(@Req() req: any, @Param('id') id: string) {
    return this.paymentsService.checkPaymentStatus(id, req.user.id);
  }

  @Get('installments')
  @UseGuards(FirebaseAuthGuard)
  async getInstallments(
    @Query('amount') amount: string,
    @Query('bin') bin: string,
  ) {
    return this.paymentsService.getInstallments(parseInt(amount), bin);
  }

  @Post('webhook')
  @Throttle({ short: { ttl: 60000, limit: 100 } }) // 100 requests por minuto por IP
  @HttpCode(200)
  async webhook(
    @Body() body: any,
    @Query() query: Record<string, string>,
    @Headers('x-signature') xSignature: string,
    @Headers('x-request-id') xRequestId: string,
    @Req() req: any,
  ) {
    // Rate limiting adicional baseado em IP do Mercado Pago
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    // IPs do Mercado Pago ( whitelist - pode ser expandido conforme necessário)
    const MERCADOPAGO_IPS = process.env.MERCADOPAGO_ALLOWED_IPS?.split(',') || [];
    
    if (MERCADOPAGO_IPS.length > 0 && !MERCADOPAGO_IPS.includes(clientIp)) {
      // Se whitelist configurada, bloquear IPs não autorizados
      this.paymentsService['logger'].warn(`Webhook request from unauthorized IP: ${clientIp}`);
    }
    
    return this.paymentsService.handleWebhook(body, query, xSignature, xRequestId);
  }
}
