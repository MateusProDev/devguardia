import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  private redis: Redis;

  constructor(private readonly prisma: PrismaService) {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        ...(redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: true } } : {}),
      });
    } else {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: null,
      });
    }
  }

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

    // Check Redis
    try {
      await this.redis.ping();
      checks.checks.redis = { status: 'ok' };
    } catch (error) {
      checks.checks.redis = { status: 'error', message: String(error) };
      checks.status = 'degraded';
    }

    // Check environment variables
    const requiredEnvVars = ['DATABASE_URL', 'REDIS_URL', 'FIREBASE_PROJECT_ID'];
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

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
