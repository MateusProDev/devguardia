import { Controller, Get, Put, Param, Body, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CreatorsService } from './creators.service';
import { UpsertCreatorDto } from './dto/upsert-creator.dto';
import { PaymentConfigDto } from './dto/payment-config.dto';

@Controller('marketplace/creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  /** GET /marketplace/creators/me — perfil do criador autenticado (ou null se não criado) */
  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  async getMe(@Req() req: any) {
    return this.creatorsService.getOwnProfile(req.user.id);
  }

  /** PUT /marketplace/creators/me — cria/atualiza perfil de criador do usuário */
  @Put('me')
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  async upsertMe(@Req() req: any, @Body() dto: UpsertCreatorDto) {
    return this.creatorsService.upsertOwnProfile(req.user.id, dto);
  }

  /** PUT /marketplace/creators/me/payment-config */
  @Put('me/payment-config')
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  async updatePaymentConfig(@Req() req: any, @Body() dto: PaymentConfigDto) {
    return this.creatorsService.updatePaymentConfig(req.user.id, dto);
  }

  /** GET /marketplace/creators/:slug — perfil público de criador (com produtos publicados) */
  @Get(':slug')
  @Throttle({ short: { ttl: 1000, limit: 30 } })
  async getPublicBySlug(@Param('slug') slug: string) {
    return this.creatorsService.getPublicBySlug(slug);
  }
}
