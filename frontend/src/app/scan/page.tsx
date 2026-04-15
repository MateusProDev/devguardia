'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { api } from '../../services/api';
import { Shield, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import ScanConsentModal from '../../components/ScanConsentModal';
import UpgradeModal from '../../components/UpgradeModal';

const checks = [
  'Certificado SSL/TLS e HTTPS',
  'Headers de seguranca HTTP (10+ verificacoes)',
  'Portas abertas e servicos expostos',
  'Configuracao de CORS',
  'Seguranca de cookies',
  'Informacoes sensiveis expostas',
  'Explicacoes e correcoes com IA',
];

function ScanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [consentText, setConsentText] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    const prefilledUrl = searchParams?.get('url') || '';
    if (prefilledUrl) setUrl(prefilledUrl);
  }, [searchParams]);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u: import('firebase/auth').User | null) => {
      if (!u) {
        router.push('/dashboard');
      }
      else setAuthChecked(true);
    });
    return () => unsub();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      new URL(url);
    } catch {
      setError('Informe uma URL valida com https:// (ex: https://meusite.com)');
      return;
    }

    try {
      const { text } = await api.getConsentText();
      setConsentText(text);
      setShowConsent(true);
    } catch {
      setError('Erro ao carregar termos. Tente novamente.');
    }
  }

  async function handleConsentAccept() {
    setLoading(true);
    setError('');
    try {
      const scan = await api.createScan(url, true);
      setShowConsent(false);
      router.push(`/report/${scan.id}`);
    } catch (err: any) {
      setShowConsent(false);
      if (err.message?.includes('Limite') || err.message?.includes('limite')) {
        setShowUpgrade(true);
      } else {
        setError(err.message || 'Erro ao iniciar scan. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            <span className="font-bold text-lg">DevGuard AI</span>
          </Link>
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors">
            &larr; Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-20">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-blue-950 border border-blue-800 rounded-2xl mb-5 sm:mb-6">
            <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">Analisar Seguranca</h1>
          <p className="text-gray-400">
            Insira a URL do seu site para identificar vulnerabilidades de seguranca.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URL do site
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://meu-app.vercel.app"
              className="input-field text-lg"
              required
              disabled={loading}
            />
            <p className="text-gray-500 text-xs mt-2">
              Somente URLs publicas sao aceitas. IPs privados e localhost sao bloqueados.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-950 border border-red-800 rounded-xl text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !url}
            className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Iniciando analise...
              </>
            ) : (
              <>
                Iniciar analise de seguranca
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 card">
          <h3 className="font-semibold mb-3 text-sm text-gray-300">O que sera analisado:</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            {checks.map((c) => (
              <li key={c} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {showConsent && consentText && (
        <ScanConsentModal
          url={url}
          consentText={consentText}
          loading={loading}
          onAccept={handleConsentAccept}
          onCancel={() => setShowConsent(false)}
        />
      )}

      {showUpgrade && (
        <UpgradeModal scanId="" onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      }
    >
      <ScanPageContent />
    </Suspense>
  );
}
