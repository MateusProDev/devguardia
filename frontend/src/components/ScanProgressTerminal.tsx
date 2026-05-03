'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';

interface ScanStep {
  id: string;
  cmd: string;
  label: string;
  /** weight (relative duration) */
  weight: number;
}

const STEPS: ScanStep[] = [
  { id: 'init',     cmd: 'devguard --init',                    label: 'Inicializando módulo de scan',          weight: 1 },
  { id: 'dns',      cmd: 'dig +short {host}',                  label: 'Resolvendo DNS do alvo',                 weight: 2 },
  { id: 'tls',      cmd: 'openssl s_client -connect {host}',   label: 'Validando certificado TLS/SSL',          weight: 3 },
  { id: 'headers',  cmd: 'curl -sI {host}',                    label: 'Analisando headers de segurança',        weight: 3 },
  { id: 'ports',    cmd: 'nmap -sT --open {host}',             label: 'Escaneando portas expostas',             weight: 8 },
  { id: 'paths',    cmd: 'fuzz /.env /.git /phpinfo.php',      label: 'Procurando caminhos sensíveis',          weight: 4 },
  { id: 'cookies',  cmd: 'inspect-cookies --strict',           label: 'Inspecionando flags de cookies',         weight: 2 },
  { id: 'cors',     cmd: 'check-cors --origin *',              label: 'Verificando configuração CORS',          weight: 2 },
  { id: 'leaks',    cmd: 'grep-secrets --entropy 4.0',         label: 'Procurando credenciais expostas',        weight: 4 },
  { id: 'ai',       cmd: 'llm.analyze --model llama-3.1',      label: 'Executando análise IA das vulns',        weight: 6 },
  { id: 'score',    cmd: 'compute-score --weighted',           label: 'Calculando score final',                 weight: 1 },
];

interface Props {
  /** ISO date when scan was created — used to compute elapsed time */
  startedAt?: string | Date;
  /** Estimated total duration in seconds (default 35s) */
  estimatedSeconds?: number;
  /** Target URL */
  url: string;
}

export default function ScanProgressTerminal({ startedAt, estimatedSeconds = 35, url }: Props) {
  const startRef = useRef<number>(startedAt ? new Date(startedAt).getTime() : Date.now());
  const [now, setNow] = useState(Date.now());
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 200);
    const blink = setInterval(() => setShowCursor((s) => !s), 500);
    return () => { clearInterval(tick); clearInterval(blink); };
  }, []);

  const elapsedSec = Math.max(0, (now - startRef.current) / 1000);
  // Saturate at 95% until backend marks COMPLETED
  const progress = Math.min(0.95, elapsedSec / estimatedSeconds);

  // Compute which step we're on based on cumulative weights
  const totalWeight = STEPS.reduce((s, x) => s + x.weight, 0);
  let cumulative = 0;
  const stepStates = STEPS.map((step) => {
    const start = cumulative / totalWeight;
    cumulative += step.weight;
    const end = cumulative / totalWeight;
    let state: 'pending' | 'running' | 'done';
    if (progress >= end) state = 'done';
    else if (progress >= start) state = 'running';
    else state = 'pending';
    return { ...step, state, start, end };
  });

  const host = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  return (
    <div className="border border-green-500/30 bg-black font-mono text-xs sm:text-sm">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-green-500/20 bg-green-950/20">
        <div className="w-3 h-3 rounded-full bg-red-500/60" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
        <div className="w-3 h-3 rounded-full bg-green-500/60" />
        <span className="text-gray-500 text-xs ml-2">scan_engine — {host}</span>
        <span className="ml-auto text-green-500/70 text-xs">
          {Math.floor(elapsedSec)}s / ~{estimatedSeconds}s
        </span>
      </div>

      {/* Steps log */}
      <div className="p-4 space-y-1.5 min-h-[260px]">
        <div className="text-green-500/80">
          <span className="text-green-500">$</span> devguard scan --target {host}
        </div>
        <div className="text-gray-700 mb-2">
          // Iniciando análise de segurança · pid={Math.floor(startRef.current % 100000)}
        </div>

        {stepStates.map((s) => {
          if (s.state === 'pending') return null;
          const localProgress = s.state === 'done' ? 1 : (progress - s.start) / (s.end - s.start);
          const cmdRendered = s.cmd.replace('{host}', host);

          return (
            <div key={s.id} className="space-y-0.5">
              <div className="flex items-start gap-2">
                <span className="text-green-500 flex-shrink-0">$</span>
                <span className="text-gray-400 break-all">{cmdRendered}</span>
              </div>
              <div className="flex items-center gap-2 pl-4">
                {s.state === 'done' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    <span className="text-green-500">[OK]</span>
                    <span className="text-gray-500">{s.label}</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-yellow-500 animate-spin flex-shrink-0" />
                    <span className="text-yellow-500">[..]</span>
                    <span className="text-gray-300">{s.label}</span>
                    <span className="text-gray-600 ml-auto">{Math.floor(localProgress * 100)}%</span>
                  </>
                )}
              </div>
              {s.state === 'running' && (
                <div className="ml-4 h-0.5 bg-green-950/40 overflow-hidden">
                  <div
                    className="h-full bg-green-500/60 transition-all duration-200"
                    style={{ width: `${Math.floor(localProgress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}

        {progress >= 0.95 && (
          <div className="pt-2 text-green-400">
            <span className="text-green-500">$</span> Finalizando · aguardando worker confirmar conclusão
            {showCursor && <span className="bg-green-500 text-black px-0.5 ml-1">_</span>}
          </div>
        )}
      </div>

      {/* Global progress bar */}
      <div className="border-t border-green-500/20 px-4 py-2.5 flex items-center gap-3">
        <span className="text-gray-500 text-xs">PROGRESS</span>
        <div className="flex-1 h-1.5 bg-green-950/40 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-200"
            style={{ width: `${Math.floor(progress * 100)}%` }}
          />
        </div>
        <span className="text-green-400 text-xs tabular-nums">{Math.floor(progress * 100)}%</span>
      </div>
    </div>
  );
}
