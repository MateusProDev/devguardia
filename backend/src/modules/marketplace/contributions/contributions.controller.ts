import {
  Controller, Get, Post, Param, Body, Req, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { ContributionsService } from './contributions.service';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { ClaimContributionDto } from './dto/claim-contribution.dto';

@Controller('marketplace/contributions')
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  /** POST /marketplace/contributions — vendedor inicia contribuição */
  @Post()
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  async create(@Req() req: any, @Body() dto: CreateContributionDto) {
    return this.contributionsService.create(req.user.id, dto);
  }

  /** GET /marketplace/contributions/me — histórico */
  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  async listMine(@Req() req: any) {
    return this.contributionsService.listMine(req.user.id);
  }

  /** GET /marketplace/contributions/me/status — status atual de supporter */
  @Get('me/status')
  @UseGuards(FirebaseAuthGuard)
  async getMyStatus(@Req() req: any) {
    return this.contributionsService.getCurrentStatus(req.user.id);
  }

  /** POST /marketplace/contributions/:id/claim — vendedor clica "paguei" */
  @Post(':id/claim')
  @UseGuards(FirebaseAuthGuard)
  async claim(@Req() req: any, @Param('id') id: string, @Body() dto: ClaimContributionDto) {
    return this.contributionsService.claim(req.user.id, id, dto);
  }

  // ─── Admin ───────────────────────────────────────────────

  /** GET /marketplace/contributions/admin/pending — admin lista pendentes */
  @Get('admin/pending')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  async adminListPending() {
    return this.contributionsService.adminListPending();
  }

  /** POST /marketplace/contributions/admin/:id/confirm — admin confirma */
  @Post('admin/:id/confirm')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  async adminConfirm(@Param('id') id: string, @Body() body: { note?: string }) {
    return this.contributionsService.adminConfirm(id, body?.note);
  }
}
