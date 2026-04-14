import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import Redis from 'ioredis';
import { ScanProcessor } from './processors/scan.processor';

const prisma = new PrismaClient();

function getRedisConnection(): Redis {
  const url = process.env.REDIS_URL;
  if (url) {
    return new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      ...(url.startsWith('rediss://') ? { tls: { rejectUnauthorized: true } } : {}),
    });
  }
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
  });
}

const scanProcessor = new ScanProcessor(prisma);

const redisConnection = getRedisConnection();

const worker = new Worker(
  'scan-queue',
  async (job) => {
    console.log(`Processing job ${job.id}: ${job.name}`);
    if (job.name === 'process-scan') {
      await scanProcessor.process(job);
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`);
});

// Health check HTTP server (required for Render free tier)
const port = parseInt(process.env.PORT || '3002');
const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'worker' }));
  } else {
    res.writeHead(404);
    res.end();
  }
});
server.listen(port, () => {
  console.log(`DevGuard AI Worker started (health check on port ${port})`);
});

process.on('SIGTERM', async () => {
  await worker.close();
  server.close();
  await redisConnection.quit();
  await prisma.$disconnect();
  process.exit(0);
});
