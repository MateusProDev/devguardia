import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Singleton Redis connection compartilhada
let redisSingleton: Redis | null = null;

function getRedisConnection(): Redis {
  if (redisSingleton) return redisSingleton;
  
  const url = process.env.REDIS_URL;
  if (url) {
    redisSingleton = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      ...(url.startsWith('rediss://') ? { tls: { rejectUnauthorized: true } } : {}),
    });
  } else {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379');
    const password = process.env.REDIS_PASSWORD || undefined;
    redisSingleton = new Redis({
      host,
      port,
      password,
      maxRetriesPerRequest: null,
    });
  }
  
  redisSingleton.on('error', (err) => console.error('[Redis Queue Service] Error:', err.message));
  return redisSingleton;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private scanQueue!: Queue;
  private redisConnection!: Redis;

  onModuleInit() {
    this.redisConnection = getRedisConnection();
    this.scanQueue = new Queue('scan-queue', {
      connection: this.redisConnection,
    });
    this.logger.log('Queue service initialized');
  }

  async onModuleDestroy() {
    await this.scanQueue?.close();
    // Não fechar conexão singleton - compartilhada
  }

  /** Wake up the worker on Render free tier by hitting its health endpoint */
  private async wakeWorker() {
    const workerUrl = process.env.WORKER_URL;
    if (!workerUrl) return;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch(`${workerUrl}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      this.logger.log('Worker wake-up ping sent');
    } catch {
      this.logger.warn('Worker wake-up ping failed (may be starting up)');
    }
  }

  async addScanJob(scanId: string) {
    // Wake up worker before adding job (Render free tier sleeps after 15min)
    await this.wakeWorker();

    await this.scanQueue.add(
      'process-scan',
      { scanId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    this.logger.log(`Scan job queued: ${scanId}`);
  }
}
