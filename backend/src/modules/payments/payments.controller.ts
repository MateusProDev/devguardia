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
  @SkipThrottle()
  @HttpCode(200)
  async webhook(
    @Body() body: any,
    @Query() query: Record<string, string>,
    @Headers('x-signature') xSignature: string,
    @Headers('x-request-id') xRequestId: string,
  ) {
    return this.paymentsService.handleWebhook(body, query, xSignature, xRequestId);
  }
}
