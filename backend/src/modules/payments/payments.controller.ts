import {
  Controller,
  Post,
  Body,
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

  @Post('checkout')
  @UseGuards(FirebaseAuthGuard)
  async createCheckout(@Req() req: any, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.createPreference(req.user.id, dto);
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
