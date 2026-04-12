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
@UseGuards(FirebaseAuthGuard)
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateScanDto) {
    return this.scansService.create(req.user.id, dto);
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.scansService.findByUser(req.user.id);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.scansService.findOne(id, req.user.id);
  }
}
