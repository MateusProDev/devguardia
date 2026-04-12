import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { ReportsService } from './reports.service';

@Controller('report')
@UseGuards(FirebaseAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':id')
  async getReport(@Req() req: any, @Param('id') id: string) {
    return this.reportsService.getReport(id, req.user.id);
  }
}
