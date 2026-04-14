import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { ScansService } from './scans.service';
import { CreateScanDto } from './dto/create-scan.dto';

@Controller('scan')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Get('consent-text')
  @UseGuards(FirebaseAuthGuard)
  async getConsentText() {
    return { text: await this.scansService.getConsentText() };
  }

  @Post()
  @UseGuards(FirebaseAuthGuard)
  async create(@Req() req: any, @Body() dto: CreateScanDto) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.scansService.create(req.user.id, dto, { ip, userAgent });
  }

  @Get()
  @UseGuards(FirebaseAuthGuard)
  async findAll(@Req() req: any) {
    return this.scansService.findByUser(req.user.id);
  }

  @Get(':id')
  @UseGuards(FirebaseAuthGuard)
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.scansService.findOne(id, req.user.id);
  }
}
