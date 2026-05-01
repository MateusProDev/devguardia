import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as PgBoss from 'pg-boss';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private boss!: PgBoss;

  constructor() {
    // Usar a mesma DATABASE_URL do Prisma
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required for pg-boss');
    }
    this.boss = new PgBoss(connectionString);
  }

  async onModuleInit() {
    await this.boss.start();
    this.logger.log('pg-boss queue service initialized');
  }

  async onModuleDestroy() {
    await this.boss.stop();
    this.logger.log('pg-boss queue service stopped');
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

  async addScanJob(scanId: string, url: string, userId: string) {
    // Wake up worker before adding job (Render free tier sleeps after 15min)
    await this.wakeWorker();

    await this.boss.send('scan-job', { scanId, url, userId }, {
      retryLimit: 3,
      retryDelay: 5000,
      expireInSeconds: 300,
    });

    this.logger.log(`Scan job queued: ${scanId}`);
  }
}
