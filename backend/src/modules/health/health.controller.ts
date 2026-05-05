import { Controller, Get, Header, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Header('X-Frame-Options', 'DENY')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'no-store')
  async check(@Res() res: Response) {
    const checks = {
      status: 'ok' as string,
      timestamp: new Date().toISOString(),
      service: 'devguard-backend',
      checks: {} as Record<string, any>,
    };

    // Check PostgreSQL
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.checks.database = { status: 'ok' };
    } catch (error) {
      checks.checks.database = { status: 'error', message: String(error) };
      checks.status = 'degraded';
    }

    // Check environment variables
    const requiredEnvVars = ['DATABASE_URL', 'FIREBASE_PROJECT_ID'];
    const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
    
    if (missingEnvVars.length > 0) {
      checks.checks.environment = { status: 'error', missing: missingEnvVars };
      checks.status = 'degraded';
    } else {
      checks.checks.environment = { status: 'ok' };
    }

    const statusCode = checks.status === 'ok' ? 200 : 503;
    return res.status(statusCode).json(checks);
  }
}
