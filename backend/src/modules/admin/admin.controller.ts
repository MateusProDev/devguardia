import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  getRecentUsers(@Query('limit') limit?: string) {
    return this.adminService.getRecentUsers(limit ? parseInt(limit, 10) : 20);
  }

  @Get('scans')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  getRecentScans(@Query('limit') limit?: string) {
    return this.adminService.getRecentScans(limit ? parseInt(limit, 10) : 20);
  }

  @Get('payments')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  getRecentPayments(@Query('limit') limit?: string) {
    return this.adminService.getRecentPayments(limit ? parseInt(limit, 10) : 20);
  }

  @Get('analytics')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  getAnalytics(@Query('days') days?: string) {
    return this.adminService.getAnalytics(days ? parseInt(days, 10) : 7);
  }

  @Post('track')
  trackPageView(@Body() body: { path: string; sessionId: string; referrer?: string; userId?: string }, @Req() req: any) {
    const userAgent = req.headers['user-agent'] || '';
    return this.adminService.trackPageView({ ...body, userAgent });
  }
}
