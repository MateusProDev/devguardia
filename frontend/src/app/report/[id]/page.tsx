'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { api } from '../../../services/api';
import { Terminal, Lock, AlertTriangle, CheckCircle, Loader2, RefreshCw, CreditCard } from 'lucide-react';
import Link from 'next/link';
import ScoreCard from '../../../components/ScoreCard';
import VulnerabilityList from '../../../components/VulnerabilityList';
import UpgradeModal from '../../../components/UpgradeModal';
import ScanProgressTerminal from '../../../components/ScanProgressTerminal';

interface Vulnerability {
  id: string;
  title: string;
  severity: string;
  description: string;
  solution: string | null;
  aiExplanation: string | null;
  aiCodeFix: string | null;
}

interface Report {
  id: string;
  url: string;
  status: string;
  score: number | null;
  isPremium: boolean;
  isLimited?: boolean;
  createdAt: string;
  vulnerabilities: Vulnerability[];
  summary?: Record<string, number>;
}

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const scanId = params?.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [polling, setPolling] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      const data = await api.getReport(scanId);
      setReport(data);
      if (data.status === 'RUNNING' || data.status === 'QUEUED') {
        setPolling(true);
      } else {
        setPolling(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [scanId]);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u: import('firebase/auth').User | null) => {
      if (!u) {
        router.push('/dashboard');
      }
      else fetchReport();
    });
    return () => unsub();
  }, [router, fetchReport]);

  useEffect(() => {
    if (!polling) return;
    let delay = 3000;
    let timeout: NodeJS.Timeout;
    const poll = () => {
      fetchReport();
      delay = Math.min(delay * 1.5, 10000);
      timeout = setTimeout(poll, delay);
    };
    timeout = setTimeout(poll, delay);
    return () => clearTimeout(timeout);
  }, [polling, fetchReport]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black matrix-bg flex items-center justify-center">
        <div className="flex items-center gap-3 text-green-500 font-mono text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>LOADING_REPORT<span className="animate-blink">_</span></span>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-black matrix-bg flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600 font-mono text-sm">[ERROR] REPORT_NOT_FOUND</p>
        <Link href="/dashboard" className="btn-primary text-xs">
          [BACK_TO_DASHBOARD]
        </Link>
      </div>
    );
  }

  const isScanning = report.status === 'RUNNING' || report.status === 'QUEUED';

  return (
    <div className="min-h-screen bg-black matrix-bg">
      <nav className="border-b border-green-900/30 px-4 sm:px-6 py-4 bg-black/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-500/20 border border-green-500/50 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-green-500" />
            </div>
            <span className="font-bold text-sm tracking-wider font-mono">
              DEV<span className="text-green-500">GUARD</span>
            </span>
          </Link>
          <Link href="/dashboard" className="text-gray-600 hover:text-green-400 text-xs transition-colors font-mono">
            [BACK_TO_DASHBOARD]
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Report header */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-green-400 text-xs font-mono mb-2">
              <span className="w-1.5 h-1.5 bg-green-500 animate-pulse" />
              <span>SCAN_REPORT</span>
            </div>
            <h1 className="text-sm sm:text-base font-mono break-all text-gray-300">{report.url}</h1>
            <p className="text-gray-700 text-xs mt-1 font-mono">
              {new Date(report.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          {isScanning && (
            <div className="flex items-center gap-2 text-yellow-500 text-xs font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              SCAN_IN_PROGRESS...
            </div>
          )}
        </div>

        {/* Score */}
        {isScanning ? (
          <div className="mb-6">
            <ScanProgressTerminal
              startedAt={report.createdAt}
              url={report.url}
              estimatedSeconds={35}
            />
          </div>
        ) : (
          report.score !== null && <ScoreCard score={report.score} summary={report.summary} />
        )}

        {/* Limited banner */}
        {report.isLimited && !isScanning && (
          <div className="card mb-6 border-yellow-500/30">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <Lock className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="font-mono">
                  <p className="text-sm text-yellow-400">
                    {report.vulnerabilities.length > 0 ? '[PARTIAL_REPORT]' : '[LOCKED_REPORT]'}
                  </p>
                  <p className="text-gray-600 text-xs mt-1">
                    {report.vulnerabilities.length > 0
                      ? `Visualizando ${report.vulnerabilities.length} de ${Object.values(report.summary || {}).reduce((a, b) => a + b, 0)} vulnerabilidades. Desbloqueie para acesso completo.`
                      : `${Object.values(report.summary || {}).reduce((a, b) => a + b, 0)} vulnerabilidades detectadas. Desbloqueie para ver detalhes e correções com IA.`
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUpgradeOpen(true)}
                className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto sm:self-end"
              >
                <CreditCard className="w-4 h-4" />
                &lt;UNLOCK_R$9,90/&gt;
              </button>
            </div>
          </div>
        )}

        {/* Vulnerabilities */}
        {!isScanning && report.vulnerabilities.length > 0 && (
          <VulnerabilityList
            vulnerabilities={report.vulnerabilities}
            isLimited={report.isLimited}
            onUpgradeClick={() => setUpgradeOpen(true)}
          />
        )}

        {!isScanning && !report.isLimited && report.vulnerabilities.length === 0 && report.status === 'COMPLETED' && (
          <div className="card text-center py-12">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-4" />
            <h3 className="text-sm font-mono font-semibold mb-2 text-green-400">ALL_CHECKS_PASSED</h3>
            <p className="text-gray-600 text-xs font-mono">// Nenhuma vulnerabilidade detectada</p>
          </div>
        )}

        {report.status === 'FAILED' && (
          <div className="card text-center py-12">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <h3 className="text-sm font-mono font-semibold mb-2 text-red-400">SCAN_FAILED</h3>
            <p className="text-gray-600 text-xs font-mono">// Não foi possível analisar este alvo. Verifique se está acessível.</p>
          </div>
        )}
      </div>

      {upgradeOpen && (
        <UpgradeModal scanId={scanId} onClose={() => setUpgradeOpen(false)} />
      )}
    </div>
  );
}
