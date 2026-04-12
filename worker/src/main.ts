import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { ScanProcessor } from './processors/scan.processor';

const prisma = new PrismaClient();

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const scanProcessor = new ScanProcessor(prisma);

const worker = new Worker(
  'scan-queue',
  async (job) => {
    console.log(`Processing job ${job.id}: ${job.name}`);
    if (job.name === 'process-scan') {
      await scanProcessor.process(job);
    }
  },
  {
    connection,
    concurrency: 3,
  },
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`);
});

console.log('DevGuard AI Worker started');

process.on('SIGTERM', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
