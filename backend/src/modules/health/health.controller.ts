import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
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
    return { ...checks, statusCode };
  }
}
