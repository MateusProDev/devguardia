'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
const SupportChatButton = dynamic(() => import('../../components/SupportChatButton'), { ssr: false });
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { signOut, signInWithGoogle } from '../../services/auth';
import { api } from '../../services/api';
import { Terminal, LogOut, Plus, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
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
      <div className="min-h-screen bg-black matrix-bg flex items-center justify-center">
        <div className="flex items-center gap-3 text-green-500 font-mono text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>INITIALIZING_SYSTEM<span className="animate-blink">_</span></span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black matrix-bg flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Terminal window */}
          <div className="border border-green-500/30 bg-black">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-green-500/20">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="text-gray-600 text-xs ml-2 font-mono">auth_terminal</span>
            </div>
            {/* Terminal content */}
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                  <Terminal className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <span className="font-bold text-lg tracking-wider font-mono">
                    DEV<span className="text-green-500">GUARD</span>
                  </span>
                </div>
              </div>

              <div className="font-mono text-sm space-y-2 mb-8">
                <div className="text-green-500/70">
                  <span className="text-green-500">$</span> authenticate --provider=google
                </div>
                <div className="text-gray-600">
                  // Acesso requerido para o sistema
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={loginLoading}
                className="w-full bg-green-600/20 text-green-400 border border-green-500/50 hover:bg-green-600/30 font-mono text-sm py-3 px-6 transition-all uppercase tracking-wider flex items-center justify-center gap-3 disabled:opacity-40"
              >
                {loginLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    &lt;LOGIN_GOOGLE/&gt;
                  </>
                )}
              </button>

              <p className="text-gray-700 text-xs mt-6 font-mono text-center">
                <a href="https://devguardia.cloud" className="hover:text-green-400 transition-colors">
                  [BACK_TO_MAIN]
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black matrix-bg">
      <SupportChatButton />
      {/* Navbar */}
      <nav className="border-b border-green-900/30 px-4 sm:px-6 py-4 bg-black/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 bg-green-500/20 border border-green-500/50 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-green-500" />
            </div>
            <span className="font-bold text-sm tracking-wider font-mono">
              DEV<span className="text-green-500">GUARD</span>
            </span>
          </div>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-gray-600 text-xs truncate hidden sm:block font-mono">{user?.email}</span>
            <button onClick={handleSignOut} className="flex items-center gap-2 text-gray-600 hover:text-red-400 text-xs transition-colors flex-shrink-0 font-mono">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">[LOGOUT]</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-green-400 text-xs font-mono mb-2">
              <span className="w-1.5 h-1.5 bg-green-500 animate-pulse" />
              <span>SCAN_HISTORY</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight">
              &lt;YOUR_SCANS/&gt;
            </h1>
            <p className="text-gray-600 text-xs mt-1 font-mono">// Gerencie e acompanhe suas análises</p>
          </div>
          <Link href="/scan" className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            &lt;NEW_SCAN/&gt;
          </Link>
        </div>

        {/* Scans List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex items-center gap-3 text-green-500 font-mono text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>LOADING_DATA<span className="animate-blink">_</span></span>
            </div>
          </div>
        ) : scans.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-12 h-12 bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
              <Terminal className="w-6 h-6 text-green-500/50" />
            </div>
            <h3 className="text-sm font-mono font-semibold mb-2 text-green-400">NO_SCANS_FOUND</h3>
            <p className="text-gray-600 text-xs mb-6 font-mono">// Inicie sua primeira análise de segurança</p>
            <Link href="/scan" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              &lt;INITIATE_SCAN/&gt;
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {scans.map((scan) => (
              <div key={scan.id} className="group bg-black border border-green-500/20 hover:border-green-500/40 transition-all flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <StatusIcon status={scan.status} />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm truncate text-gray-300">{scan.url}</p>
                    <p className="text-gray-700 text-xs mt-0.5 font-mono">
                      {new Date(scan.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right sm:hidden">
                    {scan.score !== null && (
                      <div className={`text-xl font-bold font-mono ${scoreColor(scan.score)}`}>
                        {scan.score}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-right hidden sm:block">
                    {scan.score !== null && (
                      <div className={`text-2xl font-bold font-mono ${scoreColor(scan.score)}`}>
                        {scan.score}
                      </div>
                    )}
                    {scan.status === 'RUNNING' || scan.status === 'QUEUED' ? (
                      <span className="text-yellow-500 text-xs font-mono">SCANNING...</span>
                    ) : null}
                  </div>
                  {scan.status === 'COMPLETED' && (
                    <Link
                      href={`/report/${scan.id}`}
                      className="btn-outline text-xs py-2 px-4 whitespace-nowrap w-full sm:w-auto text-center"
                    >
                      [VIEW_REPORT]
                    </Link>
                  )}
                  {(scan.status === 'RUNNING' || scan.status === 'QUEUED') && (
                    <span className="text-yellow-500 text-xs sm:hidden font-mono">SCANNING...</span>
                  )}
                </div>
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
      return <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />;
    case 'FAILED':
      return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
    case 'RUNNING':
    case 'QUEUED':
      return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin flex-shrink-0" />;
    default:
      return <Clock className="w-4 h-4 text-gray-600 flex-shrink-0" />;
  }
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-500';
  if (score >= 50) return 'text-yellow-500';
  return 'text-red-500';
}
