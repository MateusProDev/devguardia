import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { NmapService } from '../services/nmap.service';
import { HttpAnalyzerService } from '../services/http.service';
import { AiWorkerService } from '../services/ai.service';
import { calculateScore } from '../utils/score-calculator';

export class ScanProcessor {
  private readonly nmapService: NmapService;
  private readonly httpService: HttpAnalyzerService;
  private readonly aiService: AiWorkerService;

  constructor(private readonly prisma: PrismaClient) {
    this.nmapService = new NmapService();
    this.httpService = new HttpAnalyzerService();
    this.aiService = new AiWorkerService();
  }

  async process(job: Job<{ scanId: string }>) {
    const { scanId } = job.data;

    await this.prisma.scan.update({
      where: { id: scanId },
      data: { status: 'RUNNING' },
    });

    try {
      const scan = await this.prisma.scan.findUnique({ where: { id: scanId } });
      if (!scan) throw new Error(`Scan ${scanId} not found`);

      const url = new URL(scan.url);
      const hostname = url.hostname;

      const [nmapVulns, httpVulns] = await Promise.all([
        this.nmapService.scan(hostname),
        this.httpService.analyze(scan.url),
      ]);

      const allVulns = [...nmapVulns, ...httpVulns];
      const score = calculateScore(allVulns);

      // Enrich first 3 vulnerabilities with AI (to control costs)
      const enriched = await Promise.all(
        allVulns.slice(0, 3).map(async (v, i) => {
          const ai = await this.aiService.explain(v);
          return { ...v, aiExplanation: ai.explanation, aiCodeFix: ai.codeFix };
        }),
      );

      const finalVulns = [
        ...enriched,
        ...allVulns.slice(3).map((v) => ({ ...v, aiExplanation: null, aiCodeFix: null })),
      ];

      await this.prisma.$transaction(async (tx) => {
        await tx.vulnerability.deleteMany({ where: { scanId } });
        await tx.vulnerability.createMany({
          data: finalVulns.map((v, i) => ({
            scanId,
            title: v.title,
            severity: v.severity,
            description: v.description,
            solution: v.solution,
            aiExplanation: v.aiExplanation,
            aiCodeFix: v.aiCodeFix,
            isPublic: i < 2,
          })),
        });
        await tx.scan.update({
          where: { id: scanId },
          data: { status: 'COMPLETED', score },
        });
      });

      console.log(`Scan ${scanId} completed with score ${score}`);
    } catch (err) {
      console.error(`Scan ${scanId} failed: ${err}`);
      await this.prisma.scan.update({
        where: { id: scanId },
        data: { status: 'FAILED', errorMsg: String(err) },
      });
      throw err;
    }
  }
}
