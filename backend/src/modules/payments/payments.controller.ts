import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payment')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('public-key')
  getPublicKey() {
    return this.paymentsService.getPublicKey();
  }

  @Post('process')
  @UseGuards(FirebaseAuthGuard)
  async processPayment(@Req() req: any, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.processCardPayment(req.user.id, dto);
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
  @HttpCode(200)
  async webhook(
    @Body() body: any,
    @Headers('x-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(body, signature);
  }
}
