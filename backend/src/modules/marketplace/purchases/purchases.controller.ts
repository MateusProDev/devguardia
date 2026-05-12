import {
  Controller, Get, Post, Param, Body, Query, Req, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { ClaimPaymentDto } from './dto/claim-payment.dto';
import { ConfirmPurchaseDto } from './dto/confirm-purchase.dto';

@Controller('marketplace/purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  /** POST /marketplace/purchases — iniciar compra */
  @Post()
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ short: { ttl: 60000, limit: 20 } })
  async create(@Req() req: any, @Body() dto: CreatePurchaseDto) {
    return this.purchasesService.create(req.user.id, dto);
  }

  /** GET /marketplace/purchases/me — compras do usuário */
  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  async listMine(@Req() req: any) {
    return this.purchasesService.listAsBuyer(req.user.id);
  }

  /** GET /marketplace/purchases/sales — vendas (visão do vendedor) */
  @Get('sales')
  @UseGuards(FirebaseAuthGuard)
  async listSales(@Req() req: any, @Query('status') status?: string) {
    return this.purchasesService.listAsSeller(req.user.id, status);
  }

  /** GET /marketplace/purchases/:id — detalhe da compra */
  @Get(':id')
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ short: { ttl: 1000, limit: 30 } })
  async getOne(@Req() req: any, @Param('id') id: string) {
    return this.purchasesService.getOwn(req.user.id, id);
  }

  /** POST /marketplace/purchases/:id/claim — comprador clica "paguei" */
  @Post(':id/claim')
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  async claim(@Req() req: any, @Param('id') id: string, @Body() dto: ClaimPaymentDto) {
    return this.purchasesService.claimPayment(req.user.id, id, dto);
  }

  /** POST /marketplace/purchases/:id/confirm — vendedor confirma recebimento */
  @Post(':id/confirm')
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ short: { ttl: 60000, limit: 30 } })
  async confirm(@Req() req: any, @Param('id') id: string, @Body() dto: ConfirmPurchaseDto) {
    return this.purchasesService.confirmAsCreator(req.user.id, id, dto);
  }

  /** POST /marketplace/purchases/:id/cancel */
  @Post(':id/cancel')
  @UseGuards(FirebaseAuthGuard)
  async cancel(@Req() req: any, @Param('id') id: string) {
    return this.purchasesService.cancel(req.user.id, id);
  }

  /** GET /marketplace/purchases/access/:productId — verifica se tem acesso */
  @Get('access/:productId')
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ short: { ttl: 1000, limit: 30 } })
  async checkAccess(@Req() req: any, @Param('productId') productId: string) {
    const hasAccess = await this.purchasesService.hasAccess(req.user.id, productId);
    return { hasAccess };
  }
}
