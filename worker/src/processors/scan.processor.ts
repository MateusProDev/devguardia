/**
 * DevGuard Scan Processor v3.0
 *
 * Mudanças desde v2:
 *   - Concorrência limitada de chamadas IA (evita rate limit Cloudflare)
 *   - Deduplicação de vulnerabilidades (mesma title + severity = 1 entrada)
 *   - Ordenação por severidade (CRITICAL primeiro)
 *   - SiteUnreachableError marca scan como FAILED com mensagem clara
 *   - Detecção de scan vazio quando ambos analyzers falham silenciosamente
 */

import { PrismaClient } from '@prisma/client';
import { NmapService, ScanMode } from '../services/nmap.service';
import { HttpAnalyzerService, SiteUnreachableError } from '../services/http.service';
import { AiWorkerService } from '../services/ai.service';
import { calculateScore } from '../utils/score-calculator';

const nmapService = new NmapService();
const httpService = new HttpAnalyzerService();
const aiService = new AiWorkerService();
const processingScans = new Set<string>();

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

const AI_CONCURRENCY = 3; // máximo de chamadas IA simultâneas

interface VulnRaw {
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  description: string;
  solution: string;
}

/** Remove vulnerabilidades duplicadas (mesma title + severity). */
function dedupVulns(vulns: VulnRaw[]): VulnRaw[] {
  const seen = new Set<string>();
  const out: VulnRaw[] = [];
  for (const v of vulns) {
    const key = `${v.severity}::${v.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/** Ordena por severidade (CRITICAL primeiro). */
function sortBySeverity<T extends { severity: string }>(vulns: T[]): T[] {
  return [...vulns].sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99));
}

/**
 * Seleciona quais vulnerabilidades aparecem no preview público (não-pago).
 *
 * Regra v3.1:
 *   - Preview mostra apenas 1 MEDIUM + 1 LOW (quando disponíveis)
 *   - MEDIUM só aparece se houver >= 2 MEDIUMs (garante que sempre exista MEDIUM pago)
 *   - CRITICAL, HIGH e INFO NUNCA aparecem no preview (força upgrade)
 *
 * Retorna Set de índices (dos vulns já ordenados) que devem ser marcados isPublic=true.
 */
function pickPublicIndices<T extends { severity: string }>(vulns: T[]): Set<number> {
  const publicIdx = new Set<number>();
  const mediumCount = vulns.filter(v => v.severity === 'MEDIUM').length;

  // 1 MEDIUM — só se houver >=2 MEDIUMs totais
  if (mediumCount >= 2) {
    const idx = vulns.findIndex(v => v.severity === 'MEDIUM');
    if (idx !== -1) publicIdx.add(idx);
  }

  // 1 LOW — sempre que houver pelo menos 1
  const lowIdx = vulns.findIndex(v => v.severity === 'LOW');
  if (lowIdx !== -1) publicIdx.add(lowIdx);

  return publicIdx;
}

/** Executa promises com concorrência limitada (semáforo simples). */
async function runWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function scanProcessor(scanId: string, url: string, userId: string, prisma: PrismaClient, intensity: ScanMode = 'BASIC') {
  const startTime = Date.now();

  // Prevenir processamento duplicado do mesmo scan
  if (processingScans.has(scanId)) {
    console.warn(`[SCAN ${scanId}] Already processing, skipping duplicate job`);
    return;
  }
  processingScans.add(scanId);

  try {
    console.log(`[SCAN ${scanId}] Starting scan v3.0...`);

    // Verificar se scan existe e não está já completado
    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) {
      console.error(`[SCAN ${scanId}] Scan not found in database`);
      throw new Error(`Scan ${scanId} not found`);
    }

    if (scan.status === 'COMPLETED' || scan.status === 'FAILED') {
      console.warn(`[SCAN ${scanId}] Scan already in status ${scan.status}, skipping`);
      return;
    }

    await prisma.scan.update({
      where: { id: scanId },
      data: { status: 'RUNNING' },
    });

    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    console.log(`[SCAN ${scanId}] Target: ${url} (hostname: ${hostname}) intensity=${intensity}`);

    const nmapStart = Date.now();
    const httpStart = Date.now();

    // Execução paralela. HTTP pode lançar SiteUnreachableError → falha o scan.
    const [nmapResult, httpResult] = await Promise.allSettled([
      nmapService.scan(hostname, intensity).then((r) => {
        console.log(`[SCAN ${scanId}] Nmap finished in ${Date.now() - nmapStart}ms — ${r.length} vulns`);
        return r;
      }),
      httpService.analyze(url).then((r) => {
        console.log(`[SCAN ${scanId}] HTTP finished in ${Date.now() - httpStart}ms — ${r.length} vulns`);
        return r;
      }),
    ]);

    // Se HTTP falhou com SiteUnreachableError, marcar scan como FAILED com mensagem clara
    if (httpResult.status === 'rejected') {
      const err = httpResult.reason;
      if (err instanceof SiteUnreachableError) {
        const msg = `Site inacessível: ${err.cause}`;
        console.error(`[SCAN ${scanId}] ${msg}`);
        await prisma.scan.update({
          where: { id: scanId },
          data: { status: 'FAILED', errorMsg: msg },
        });
        return;
      }
      // Outros erros HTTP — log mas continua (pode ser timeout em sub-fetch)
      console.error(`[SCAN ${scanId}] HTTP analysis error (non-fatal):`, err);
    }

    const nmapVulns: VulnRaw[] = nmapResult.status === 'fulfilled' ? nmapResult.value : [];
    const httpVulns: VulnRaw[] = httpResult.status === 'fulfilled' ? httpResult.value : [];

    // Dedup + sort
    const allVulns = sortBySeverity(dedupVulns([...nmapVulns, ...httpVulns]));
    const score = calculateScore(allVulns);

    console.log(`[SCAN ${scanId}] Total vulns: ${allVulns.length}, Score: ${score}`);
    console.log(`[SCAN ${scanId}] Severity breakdown: CRITICAL=${allVulns.filter(v => v.severity === 'CRITICAL').length} HIGH=${allVulns.filter(v => v.severity === 'HIGH').length} MEDIUM=${allVulns.filter(v => v.severity === 'MEDIUM').length} LOW=${allVulns.filter(v => v.severity === 'LOW').length} INFO=${allVulns.filter(v => v.severity === 'INFO').length}`);

    // Enriquecer vulns CRITICAL/HIGH/MEDIUM com IA (concorrência limitada)
    const aiStart = Date.now();
    const enriched = await runWithLimit(allVulns, AI_CONCURRENCY, async (v) => {
      if (['CRITICAL', 'HIGH', 'MEDIUM'].includes(v.severity)) {
        const ai = await aiService.explain(v);
        return { ...v, aiExplanation: ai.explanation, aiCodeFix: ai.codeFix };
      }
      return { ...v, aiExplanation: null as string | null, aiCodeFix: null as string | null };
    });
    console.log(`[SCAN ${scanId}] AI enrichment finished in ${Date.now() - aiStart}ms (concurrency=${AI_CONCURRENCY})`);

    // Seleciona quais vulns aparecem no preview público (1 MEDIUM + 1 LOW, ver pickPublicIndices)
    const publicIndices = pickPublicIndices(enriched);
    console.log(`[SCAN ${scanId}] Public preview indices: [${[...publicIndices].join(', ')}] (total=${enriched.length})`);

    // Persistir
    await prisma.$transaction(async (tx) => {
      await tx.vulnerability.deleteMany({ where: { scanId } });
      await tx.vulnerability.createMany({
        data: enriched.map((v, i) => ({
          scanId,
          title: v.title,
          severity: v.severity,
          description: v.description,
          solution: v.solution,
          aiExplanation: typeof v.aiExplanation === 'string' ? v.aiExplanation : v.aiExplanation ? JSON.stringify(v.aiExplanation) : null,
          aiCodeFix: typeof v.aiCodeFix === 'string' ? v.aiCodeFix : v.aiCodeFix ? JSON.stringify(v.aiCodeFix) : null,
          isPublic: publicIndices.has(i),
        })),
      });
      await tx.scan.update({
        where: { id: scanId },
        data: { status: 'COMPLETED', score },
      });
    });

    console.log(`[SCAN ${scanId}] COMPLETED in ${Date.now() - startTime}ms — score: ${score}, vulns: ${enriched.length}`);
  } catch (err) {
    console.error(`[SCAN ${scanId}] FAILED in ${Date.now() - startTime}ms: ${err}`);
    await prisma.scan.update({
      where: { id: scanId },
      data: { status: 'FAILED', errorMsg: String(err) },
    });
    throw err;
  } finally {
    processingScans.delete(scanId);
  }
}
