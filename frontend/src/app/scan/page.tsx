'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { api } from '../../services/api';
import { Terminal, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import ScanConsentModal from '../../components/ScanConsentModal';
import UpgradeModal from '../../components/UpgradeModal';

const checks = [
  'SSL/TLS certificate validation',
  'HTTP security headers (10+ checks)',
  'Open ports & exposed services',
  'CORS misconfiguration',
  'Cookie security flags',
  'Sensitive data exposure',
  'AI-powered fix generation',
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
      <div className="min-h-screen bg-black matrix-bg flex items-center justify-center">
        <div className="flex items-center gap-3 text-green-500 font-mono text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>LOADING_MODULE<span className="animate-blink">_</span></span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black matrix-bg">
      <nav className="border-b border-green-900/30 px-4 sm:px-6 py-4 bg-black/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-20">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 text-green-400 text-xs font-mono mb-4 border border-green-500/30 px-3 py-1">
            <span className="w-1.5 h-1.5 bg-green-500 animate-pulse" />
            <span>SCAN_MODULE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-3 font-mono tracking-tight">
            &lt;SECURITY_SCAN/&gt;
          </h1>
          <p className="text-gray-600 font-mono text-sm">
            // Insira a URL do alvo para iniciar a análise
          </p>
        </div>

        {/* Terminal-style form */}
        <div className="border border-green-500/30 bg-black">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-green-500/20">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
            <span className="text-gray-600 text-xs ml-2 font-mono">scan_input</span>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <div className="flex items-center gap-2 text-green-500 text-xs mb-3 font-mono">
                <span>$</span>
                <span className="opacity-70">scan --url</span>
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://target-domain.com"
                className="input-field text-sm"
                required
                disabled={loading}
              />
              <p className="text-gray-700 text-xs mt-2 font-mono">
                [INFO] Somente URLs publicas. IPs privados e localhost bloqueados.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-3 bg-red-950/50 border border-red-800/50 text-red-400 text-xs font-mono">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !url}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  EXECUTING...
                </>
              ) : (
                <>
                  &lt;EXECUTE_SCAN/&gt;
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 border border-green-500/20 bg-black p-5">
          <h3 className="font-mono text-xs text-green-400 mb-3 uppercase tracking-wider">
            [SCAN_VECTORS]
          </h3>
          <ul className="space-y-2 text-xs text-gray-600 font-mono">
            {checks.map((c, i) => (
              <li key={c} className="flex items-center gap-2">
                <span className="text-green-500">[+]</span>
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
        <div className="min-h-screen bg-black matrix-bg flex items-center justify-center">
          <div className="flex items-center gap-3 text-green-500 font-mono text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>LOADING<span className="animate-blink">_</span></span>
          </div>
        </div>
      }
    >
      <ScanPageContent />
    </Suspense>
  );
}
