'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { signOut, signInWithGoogle } from '../../services/auth';
import { api } from '../../services/api';
import { Shield, LogOut, Plus, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ScanItem {
  id: string;
  url: string;
  status: string;
  score: number | null;
  isPremium: boolean;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (u: User | null) => {
      if (!u) {
        setLoading(false);
        setAuthChecked(true);
        return;
      }
      setUser(u);
      setAuthChecked(true);
      try {
        const data = await api.listScans();
        setScans(data);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  async function handleLogin() {
    setLoginLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    setUser(null);
    setScans([]);
  }

  if (!authChecked || (loading && !user)) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-blue-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">DevGuard AI</h1>
          <p className="text-gray-400 mb-8">Faça login para acessar o painel</p>
          <button
            onClick={handleLogin}
            disabled={loginLoading}
            className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3"
          >
            {loginLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Entrar com Google
              </>
            )}
          </button>
          <p className="text-gray-600 text-sm mt-4">
            <a href="https://devguardia.cloud" className="hover:text-gray-400 transition-colors">&larr; Voltar ao site</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            <span className="font-bold text-lg">DevGuard AI</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{user?.email}</span>
            <button onClick={handleSignOut} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Seus Scans</h1>
            <p className="text-gray-400 text-sm mt-1">Gerencie e acompanhe suas análises de segurança</p>
          </div>
          <Link href="/scan" className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Novo Scan
          </Link>
        </div>

        {/* Scans List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : scans.length === 0 ? (
          <div className="card text-center py-16">
            <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum scan ainda</h3>
            <p className="text-gray-400 text-sm mb-6">Analise seu primeiro site agora</p>
            <Link href="/scan" className="btn-primary inline-flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Iniciar análise
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {scans.map((scan) => (
              <div key={scan.id} className="card flex items-center gap-4">
                <StatusIcon status={scan.status} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{scan.url}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {new Date(scan.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  {scan.score !== null && (
                    <div className={`text-2xl font-bold ${scoreColor(scan.score)}`}>
                      {scan.score}
                    </div>
                  )}
                  {scan.status === 'RUNNING' || scan.status === 'QUEUED' ? (
                    <span className="text-yellow-500 text-xs">Analisando...</span>
                  ) : null}
                </div>
                {scan.status === 'COMPLETED' && (
                  <Link
                    href={`/report/${scan.id}`}
                    className="btn-outline text-sm py-2 px-4 whitespace-nowrap"
                  >
                    Ver relatório
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />;
    case 'FAILED':
      return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
    case 'RUNNING':
    case 'QUEUED':
      return <Loader2 className="w-5 h-5 text-yellow-500 animate-spin flex-shrink-0" />;
    default:
      return <Clock className="w-5 h-5 text-gray-500 flex-shrink-0" />;
  }
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-500';
  if (score >= 50) return 'text-yellow-500';
  return 'text-red-500';
}
