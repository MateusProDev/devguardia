import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

function getRedisConnection(): Redis {
  const url = process.env.REDIS_URL;
  if (url) {
    return new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      ...(url.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
    });
  }
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
  });
}

@Injectable()
export class QueueService implements OnModuleInit {
  private scanQueue: Queue;

  onModuleInit() {
    this.scanQueue = new Queue('scan-queue', {
      connection: getRedisConnection(),
    });
  }

  async addScanJob(scanId: string) {
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
  }
}
