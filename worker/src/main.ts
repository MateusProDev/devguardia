import PgBoss from 'pg-boss';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import { scanProcessor } from './processors/scan.processor';

interface ScanJobData {
  scanId: string;
  url: string;
  userId: string;
  intensity?: 'BASIC' | 'AGGRESSIVE';
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
});

// Usar a mesma DATABASE_URL do Prisma
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required for pg-boss');
}

const boss = new PgBoss(connectionString);

// Health check HTTP server (required for Render free tier)
const port = parseInt(process.env.PORT || '3002');
const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'worker', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

async function start() {
  await boss.start();
  console.log('[WORKER] pg-boss started');

  await boss.work('scan-job', { teamSize: 2 }, async (job) => {
    console.log(`[WORKER] Processing job ${job.id}: scan-job`);
    try {
      const data = job.data as ScanJobData;
      await scanProcessor(data.scanId, data.url, data.userId, prisma, data.intensity || 'BASIC');
      console.log(`[WORKER] Job ${job.id} completed`);
    } catch (err) {
      console.error(`[WORKER] Job ${job.id} failed:`, err);
      throw err;
    }
  });

  server.listen(port, () => {
    console.log(`[WORKER] DevGuard AI Worker started (health check on port ${port})`);
  });
}

start().catch((err) => {
  console.error('[WORKER] Failed to start:', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('[WORKER] SIGTERM received, shutting down...');
  await boss.stop();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('[WORKER] Unhandled rejection:', err);
});
