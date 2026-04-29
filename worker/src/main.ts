import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import Redis from 'ioredis';
import { ScanProcessor } from './processors/scan.processor';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
});

// Singleton Redis connection
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
    redisSingleton = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });
  }
  
  redisSingleton.on('connect', () => console.log('[REDIS] Connected'));
  redisSingleton.on('ready', () => console.log('[REDIS] Ready'));
  redisSingleton.on('error', (err) => console.error('[REDIS] Error:', err.message));
  redisSingleton.on('close', () => console.warn('[REDIS] Connection closed'));
  
  return redisSingleton;
}

const scanProcessor = new ScanProcessor(prisma);
const redisConnection = getRedisConnection();

const worker = new Worker(
  'scan-queue',
  async (job) => {
    console.log(`[WORKER] Processing job ${job.id}: ${job.name}`);
    if (job.name === 'process-scan') {
      await scanProcessor.process(job);
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
    stalledInterval: 30000,
    lockDuration: 120000,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        count: 1000,
        age: 3600, // 1 hora
      },
      removeOnFail: {
        count: 5000,
        age: 86400, // 24 horas
      },
    },
  },
);

worker.on('completed', (job) => {
  console.log(`[WORKER] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[WORKER] Job ${job?.id} failed: ${err.message}`);
});

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
server.listen(port, () => {
  console.log(`[WORKER] DevGuard AI Worker started (health check on port ${port})`);
});

process.on('SIGTERM', async () => {
  console.log('[WORKER] SIGTERM received, shutting down...');
  await worker.close();
  server.close();
  await redisConnection.quit();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('[WORKER] Unhandled rejection:', err);
});
