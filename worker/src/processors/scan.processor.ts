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
    const startTime = Date.now();

    console.log(`[SCAN ${scanId}] Starting scan...`);

    await this.prisma.scan.update({
      where: { id: scanId },
      data: { status: 'RUNNING' },
    });

    try {
      const scan = await this.prisma.scan.findUnique({ where: { id: scanId } });
      if (!scan) throw new Error(`Scan ${scanId} not found`);

      const url = new URL(scan.url);
      const hostname = url.hostname;

      console.log(`[SCAN ${scanId}] Target: ${scan.url} (hostname: ${hostname})`);

      const nmapStart = Date.now();
      const httpStart = Date.now();

      const [nmapVulns, httpVulns] = await Promise.all([
        this.nmapService.scan(hostname).then((r) => {
          console.log(`[SCAN ${scanId}] Nmap finished in ${Date.now() - nmapStart}ms — found ${r.length} vulns: ${r.map((v) => v.title).join(', ') || 'none'}`);
          return r;
        }),
        this.httpService.analyze(scan.url).then((r) => {
          console.log(`[SCAN ${scanId}] HTTP finished in ${Date.now() - httpStart}ms — found ${r.length} vulns: ${r.map((v) => `${v.title}[${v.severity}]`).join(', ') || 'none'}`);
          return r;
        }),
      ]);

      const allVulns = [...nmapVulns, ...httpVulns];
      const score = calculateScore(allVulns);

      console.log(`[SCAN ${scanId}] Total vulns: ${allVulns.length}, Score: ${score}`);
      console.log(`[SCAN ${scanId}] Severity breakdown: CRITICAL=${allVulns.filter((v) => v.severity === 'CRITICAL').length} HIGH=${allVulns.filter((v) => v.severity === 'HIGH').length} MEDIUM=${allVulns.filter((v) => v.severity === 'MEDIUM').length} LOW=${allVulns.filter((v) => v.severity === 'LOW').length} INFO=${allVulns.filter((v) => v.severity === 'INFO').length}`);

      // Enrich first 3 vulnerabilities with AI (to control costs)
      const aiStart = Date.now();
      const enriched = await Promise.all(
        allVulns.slice(0, 3).map(async (v, i) => {
          const ai = await this.aiService.explain(v);
          return { ...v, aiExplanation: ai.explanation, aiCodeFix: ai.codeFix };
        }),
      );
      console.log(`[SCAN ${scanId}] AI enrichment finished in ${Date.now() - aiStart}ms`);

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

      console.log(`[SCAN ${scanId}] COMPLETED in ${Date.now() - startTime}ms — score: ${score}, vulns: ${finalVulns.length}`);
    } catch (err) {
      console.error(`[SCAN ${scanId}] FAILED in ${Date.now() - startTime}ms: ${err}`);
      await this.prisma.scan.update({
        where: { id: scanId },
        data: { status: 'FAILED', errorMsg: String(err) },
      });
      throw err;
    }
  }
}
