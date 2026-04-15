'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { api } from '../../../services/api';
import { Shield, Lock, AlertTriangle, CheckCircle, Loader2, RefreshCw, CreditCard } from 'lucide-react';
import Link from 'next/link';
import ScoreCard from '../../../components/ScoreCard';
import VulnerabilityList from '../../../components/VulnerabilityList';
import UpgradeModal from '../../../components/UpgradeModal';

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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Relatório não encontrado.</p>
        <Link href="/dashboard" className="btn-primary text-sm">
          ← Dashboard
        </Link>
      </div>
    );
  }

  const isScanning = report.status === 'RUNNING' || report.status === 'QUEUED';

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            <span className="font-bold">DevGuard AI</span>
          </Link>
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">
            ← Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Report header */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="min-w-0">
            <p className="text-gray-400 text-sm mb-1">Relatório de segurança</p>
            <h1 className="text-lg sm:text-xl font-bold break-all">{report.url}</h1>
            <p className="text-gray-500 text-xs mt-1">
              {new Date(report.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          {isScanning && (
            <div className="flex items-center gap-2 text-yellow-400 font-medium text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Análise em andamento...
            </div>
          )}
        </div>

        {/* Score */}
        {isScanning ? (
          <div className="card flex items-center gap-4 mb-6">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <div>
              <p className="font-semibold">Analisando seu site...</p>
              <p className="text-gray-400 text-sm">Isso leva até 30 segundos.</p>
            </div>
          </div>
        ) : (
          report.score !== null && <ScoreCard score={report.score} summary={report.summary} />
        )}

        {/* Limited banner */}
        {report.isLimited && !isScanning && (
          <div className="card mb-6 bg-blue-950 border-blue-800">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-300">Vulnerabilidades encontradas</p>
                  <p className="text-blue-400 text-sm">
                    Foram encontradas {Object.values(report.summary || {}).reduce((a, b) => a + b, 0)} vulnerabilidades.
                    Desbloqueie o relatório completo para ver os detalhes e as correções com IA.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUpgradeOpen(true)}
                className="btn-primary flex items-center justify-center gap-2 text-sm whitespace-nowrap w-full sm:w-auto sm:self-end"
              >
                <CreditCard className="w-4 h-4" />
                Desbloquear por R$9,90
              </button>
            </div>
          </div>
        )}

        {/* Vulnerabilities */}
        {!isScanning && !report.isLimited && report.vulnerabilities.length > 0 && (
          <VulnerabilityList
            vulnerabilities={report.vulnerabilities}
            isLimited={false}
            onUpgradeClick={() => setUpgradeOpen(true)}
          />
        )}

        {!isScanning && !report.isLimited && report.vulnerabilities.length === 0 && report.status === 'COMPLETED' && (
          <div className="card text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma vulnerabilidade encontrada!</h3>
            <p className="text-gray-400 text-sm">Seu site passou em todas as verificações.</p>
          </div>
        )}

        {report.status === 'FAILED' && (
          <div className="card text-center py-12">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Falha na análise</h3>
            <p className="text-gray-400 text-sm">Não foi possível analisar este site. Verifique se está acessível.</p>
          </div>
        )}
      </div>

      {upgradeOpen && (
        <UpgradeModal scanId={scanId} onClose={() => setUpgradeOpen(false)} />
      )}
    </div>
  );
}
