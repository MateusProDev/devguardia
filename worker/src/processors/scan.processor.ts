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
  private readonly processingScans = new Set<string>();

  constructor(private readonly prisma: PrismaClient) {
    this.nmapService = new NmapService();
    this.httpService = new HttpAnalyzerService();
    this.aiService = new AiWorkerService();
  }

  async process(job: Job<{ scanId: string }>) {
    const { scanId } = job.data;
    const startTime = Date.now();

    // Prevenir processamento duplicado do mesmo scan
    if (this.processingScans.has(scanId)) {
      console.warn(`[SCAN ${scanId}] Already processing, skipping duplicate job`);
      return;
    }
    this.processingScans.add(scanId);

    try {
      console.log(`[SCAN ${scanId}] Starting scan...`);

      // Verificar se scan existe e não está já completado
      const scan = await this.prisma.scan.findUnique({ where: { id: scanId } });
      if (!scan) {
        console.error(`[SCAN ${scanId}] Scan not found in database`);
        throw new Error(`Scan ${scanId} not found`);
      }

      // Se scan já está completado ou falhou, não processar novamente
      if (scan.status === 'COMPLETED' || scan.status === 'FAILED') {
        console.warn(`[SCAN ${scanId}] Scan already in status ${scan.status}, skipping`);
        return;
      }

      await this.prisma.scan.update({
        where: { id: scanId },
        data: { status: 'RUNNING' },
      });

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

      // Enrich CRITICAL, HIGH, MEDIUM vulns with AI
      const aiStart = Date.now();
      const enriched = await Promise.all(
        allVulns.map(async (v) => {
          if (["CRITICAL", "HIGH", "MEDIUM"].includes(v.severity)) {
            const ai = await this.aiService.explain(v);
            return { ...v, aiExplanation: ai.explanation, aiCodeFix: ai.codeFix };
          }
          return { ...v, aiExplanation: null, aiCodeFix: null };
        }),
      );
      console.log(`[SCAN ${scanId}] AI enrichment finished in ${Date.now() - aiStart}ms`);

      const finalVulns = enriched;

      await this.prisma.$transaction(async (tx) => {
        await tx.vulnerability.deleteMany({ where: { scanId } });
        await tx.vulnerability.createMany({
          data: finalVulns.map((v, i) => ({
            scanId,
            title: v.title,
            severity: v.severity,
            description: v.description,
            solution: v.solution,
            aiExplanation: typeof v.aiExplanation === 'string' ? v.aiExplanation : v.aiExplanation ? JSON.stringify(v.aiExplanation) : null,
            aiCodeFix: typeof v.aiCodeFix === 'string' ? v.aiCodeFix : v.aiCodeFix ? JSON.stringify(v.aiCodeFix) : null,
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
    } finally {
      this.processingScans.delete(scanId);
    }
  }
}
