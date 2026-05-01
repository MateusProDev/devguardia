'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { api } from '../../services/api';
import {
  Shield, Users, Scan, AlertTriangle, DollarSign, Eye,
  Loader2, LogOut, TrendingUp, CreditCard, Activity,
  BarChart3, Globe, Clock, MessageCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
const AdminSupportTab = dynamic(() => import('../../components/AdminSupportTab'), { ssr: false });

interface Stats {
  users: { total: number; today: number; thisMonth: number };
  scans: { total: number; today: number; thisMonth: number; byStatus: Record<string, number> };
  vulnerabilities: { total: number; bySeverity: Record<string, number> };
  revenue: {
    totalCents: number;
    singleScanCents: number;
    subscriptionCents: number;
    thisMonthCents: number;
    lastMonthCents: number;
    totalPayments: number;
    activeSubscriptions: number;
  };
}

interface Analytics {
  totalViews: number;
  uniqueSessions: number;
  topPages: { path: string; views: number }[];
  dailyViews: { date: string; views: number }[];
}

interface RecentUser {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  _count: { scans: number; payments: number };
  subscription: { active: boolean; expiresAt: string } | null;
}

interface RecentScan {
  id: string;
  url: string;
  status: string;
  score: number | null;
  createdAt: string;
  user: { email: string };
  _count: { vulnerabilities: number };
}

interface RecentPayment {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  user: { email: string };
}

function formatBRL(cents: number) {
  return `R$${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-400',
  HIGH: 'text-orange-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-cyan-400',
  INFO: 'text-gray-400',
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'text-green-400',
  RUNNING: 'text-yellow-400',
  QUEUED: 'text-cyan-400',
  FAILED: 'text-red-400',
  PENDING: 'text-gray-400',
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loginMode, setLoginMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [scans, setScans] = useState<RecentScan[]>([]);
  const [payments, setPayments] = useState<RecentPayment[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'scans' | 'payments' | 'analytics' | 'support'>('overview');
  const [error, setError] = useState('');
  const [analyticsDays, setAnalyticsDays] = useState(7);

  const fetchAll = useCallback(async () => {
    try {
      setError('');
      const [s, a, u, sc, p] = await Promise.all([
        api.adminStats(),
        api.adminAnalytics(analyticsDays),
        api.adminUsers(50),
        api.adminScans(50),
        api.adminPayments(50),
      ]);
      setStats(s);
      setAnalytics(a);
      setUsers(u);
      setScans(sc);
      setPayments(p);
    } catch (err: any) {
      setError(err.message || 'Acesso negado');
    } finally {
      setLoading(false);
    }
  }, [analyticsDays]);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        setLoginMode(true);
        setLoading(false);
      } else {
        setLoginMode(false);
        fetchAll();
      }
    });
    return () => unsub();
  }, [fetchAll]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setLoginError('Email/Senha não habilitado no Firebase. Ative em: Firebase Console → Authentication → Sign-in method → Email/Password.');
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setLoginError('Email ou senha inválidos.');
      } else {
        setLoginError(`Erro: ${code || err?.message || 'desconhecido'}`);
      }
    } finally {
      setLoginLoading(false);
      // Limpa a senha do estado imediatamente após tentativa de login
      setPassword('');
    }
  }

  async function handleLogout() {
    if (!auth) return;
    await auth.signOut();
    setLoginMode(true);
    setStats(null);
  }

  if (loginMode) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Shield className="w-6 h-6 text-green-500" />
            <span className="text-sm font-bold font-mono text-green-400">ADMIN_TERMINAL</span>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 border border-green-500/20 p-6">
            <div>
              <label className="text-xs text-gray-600 font-mono">// email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field mt-1"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 font-mono">// password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field mt-1"
                required
              />
            </div>
            {loginError && <p className="text-red-400 text-xs font-mono">{loginError}</p>}
            <button
              type="submit"
              disabled={loginLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loginLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              [LOGIN]
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-green-500 font-mono text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>LOADING_ADMIN<span className="animate-pulse">_</span></span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Shield className="w-10 h-10 text-red-500/50" />
        <p className="text-red-400 text-sm font-mono font-bold">[ACCESS_DENIED]</p>
        <p className="text-gray-600 text-xs font-mono">{error}</p>
        <button onClick={handleLogout} className="text-green-400 hover:text-green-300 text-xs font-mono">
          [LOGOUT_&amp;_RETRY]
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const tabs = [
    { id: 'overview' as const, label: 'Visão Geral', icon: BarChart3 },
    { id: 'users' as const, label: 'Usuários', icon: Users },
    { id: 'scans' as const, label: 'Scans', icon: Scan },
    { id: 'payments' as const, label: 'Pagamentos', icon: CreditCard },
    { id: 'analytics' as const, label: 'Tráfego', icon: Eye },
    { id: 'support' as const, label: 'Suporte', icon: MessageCircle },
  ];
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <nav className="border-b border-green-500/20 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            <span className="font-bold text-sm font-mono text-green-400">ADMIN_PANEL</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={fetchAll} className="text-gray-600 hover:text-green-400 text-xs font-mono flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> [REFRESH]
            </button>
            <button onClick={handleLogout} className="text-gray-600 hover:text-red-400 text-xs font-mono flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" /> [LOGOUT]
            </button>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="border-b border-green-500/10 px-4 sm:px-6 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-mono border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-gray-600 hover:text-gray-400'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card icon={Users} label="Usuários" value={stats.users.total} sub={`+${stats.users.today} hoje`} color="green" />
              <Card icon={Scan} label="Scans" value={stats.scans.total} sub={`+${stats.scans.today} hoje`} color="green" />
              <Card icon={AlertTriangle} label="Vulnerabilidades" value={stats.vulnerabilities.total} sub="identificadas" color="yellow" />
              <Card icon={DollarSign} label="Receita Total" value={formatBRL(stats.revenue.totalCents)} sub={`${stats.revenue.totalPayments} pagamentos`} color="green" />
            </div>
            {/* Revenue details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black border border-green-500/20 p-5">
                <p className="text-gray-600 text-xs font-mono mb-1">// Scan Avulso</p>
                <p className="text-lg font-bold text-white font-mono">{formatBRL(stats.revenue.singleScanCents)}</p>
              </div>
              <div className="bg-black border border-green-500/20 p-5">
                <p className="text-gray-600 text-xs font-mono mb-1">// Assinaturas</p>
                <p className="text-lg font-bold text-white font-mono">{formatBRL(stats.revenue.subscriptionCents)}</p>
                <p className="text-[10px] text-green-400 mt-1 font-mono">{stats.revenue.activeSubscriptions} ativas</p>
              </div>
              <div className="bg-black border border-green-500/20 p-5">
                <p className="text-gray-600 text-xs font-mono mb-1">// Receita este mês</p>
                <p className="text-lg font-bold text-white font-mono">{formatBRL(stats.revenue.thisMonthCents)}</p>
                {stats.revenue.lastMonthCents > 0 && (
                  <p className={`text-xs mt-1 ${stats.revenue.thisMonthCents >= stats.revenue.lastMonthCents ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.revenue.thisMonthCents >= stats.revenue.lastMonthCents ? '↑' : '↓'}{' '}
                    vs {formatBRL(stats.revenue.lastMonthCents)} mês anterior
                  </p>
                )}
              </div>
            </div>
            {/* Severity & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black border border-green-500/20 p-5">
                <h3 className="text-xs font-mono font-bold mb-3 flex items-center gap-2 text-green-400">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" /> [SEVERITY_BREAKDOWN]
                </h3>
                <div className="space-y-2">
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map((sev) => {
                    const count = stats.vulnerabilities.bySeverity[sev] || 0;
                    const pct = stats.vulnerabilities.total > 0 ? (count / stats.vulnerabilities.total) * 100 : 0;
                    return (
                      <div key={sev} className="flex items-center gap-3">
                        <span className={`text-[10px] font-mono font-bold w-16 ${SEVERITY_COLORS[sev]}`}>{sev}</span>
                        <div className="flex-1 bg-gray-900 h-1.5">
                          <div className={`h-1.5 ${sev === 'CRITICAL' ? 'bg-red-500' : sev === 'HIGH' ? 'bg-orange-500' : sev === 'MEDIUM' ? 'bg-yellow-500' : sev === 'LOW' ? 'bg-cyan-500' : 'bg-gray-600'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right font-mono">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-black border border-green-500/20 p-5">
                <h3 className="text-xs font-mono font-bold mb-3 flex items-center gap-2 text-green-400">
                  <Activity className="w-3.5 h-3.5" /> [SCAN_STATUS]
                </h3>
                <div className="space-y-2">
                  {['COMPLETED', 'RUNNING', 'QUEUED', 'FAILED', 'PENDING'].map((status) => {
                    const count = stats.scans.byStatus[status] || 0;
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <span className={`text-sm ${STATUS_COLORS[status]}`}>{status}</span>
                        <span className="text-sm text-gray-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* Quick analytics */}
            {analytics && (
              <div className="bg-black border border-green-500/20 p-5">
                <h3 className="text-xs font-mono font-bold mb-3 flex items-center gap-2 text-green-400">
                  <Globe className="w-3.5 h-3.5" /> [TRAFFIC] // últimos {analyticsDays} dias
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{analytics.totalViews}</p>
                    <p className="text-gray-500 text-sm">Page views</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics.uniqueSessions}</p>
                    <p className="text-gray-500 text-sm">Sessões únicas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics.topPages.length}</p>
                    <p className="text-gray-500 text-sm">Páginas visitadas</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <h2 className="text-sm font-mono font-bold flex items-center gap-2 text-green-400">
              <Users className="w-4 h-4" />
              [USERS] // {stats.users.total} total
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left py-3 px-3">Email</th>
                    <th className="text-left py-3 px-3">Nome</th>
                    <th className="text-center py-3 px-3">Scans</th>
                    <th className="text-center py-3 px-3">Pagamentos</th>
                    <th className="text-center py-3 px-3">Assinatura</th>
                    <th className="text-right py-3 px-3">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                      <td className="py-3 px-3 text-white">{u.email}</td>
                      <td className="py-3 px-3 text-gray-400">{u.displayName || '-'}</td>
                      <td className="py-3 px-3 text-center">{u._count.scans}</td>
                      <td className="py-3 px-3 text-center">{u._count.payments}</td>
                      <td className="py-3 px-3 text-center">
                        {u.subscription?.active ? (
                          <span className="text-green-400 text-xs font-semibold">Ativa</span>
                        ) : (
                          <span className="text-gray-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-500">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SCANS TAB */}
        {activeTab === 'scans' && (
          <div className="space-y-4">
            <h2 className="text-sm font-mono font-bold flex items-center gap-2 text-green-400">
              <Scan className="w-4 h-4" />
              [SCANS] // {stats.scans.total} total
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left py-3 px-3">URL</th>
                    <th className="text-left py-3 px-3">Usuário</th>
                    <th className="text-center py-3 px-3">Status</th>
                    <th className="text-center py-3 px-3">Score</th>
                    <th className="text-center py-3 px-3">Vulns</th>
                    <th className="text-right py-3 px-3">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((s) => (
                    <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                      <td className="py-3 px-3 text-white max-w-xs truncate">{s.url}</td>
                      <td className="py-3 px-3 text-gray-400 text-xs">{s.user.email}</td>
                      <td className={`py-3 px-3 text-center text-xs font-semibold ${STATUS_COLORS[s.status] || ''}`}>
                        {s.status}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {s.score !== null ? (
                          <span className={s.score >= 80 ? 'text-green-400' : s.score >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                            {s.score}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-3 text-center">{s._count.vulnerabilities}</td>
                      <td className="py-3 px-3 text-right text-gray-500">{formatDate(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <h2 className="text-sm font-mono font-bold flex items-center gap-2 text-green-400">
              <CreditCard className="w-4 h-4" />
              [PAYMENTS]
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left py-3 px-3">Usuário</th>
                    <th className="text-center py-3 px-3">Tipo</th>
                    <th className="text-center py-3 px-3">Valor</th>
                    <th className="text-center py-3 px-3">Status</th>
                    <th className="text-right py-3 px-3">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                      <td className="py-3 px-3 text-white text-xs">{p.user.email}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 ${
                          p.type === 'SUBSCRIPTION' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-gray-900 text-gray-400 border border-gray-700'
                        }`}>
                          {p.type === 'SUBSCRIPTION' ? 'Assinatura' : 'Avulso'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-white">{formatBRL(p.amount)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-xs font-semibold ${
                          p.status === 'APPROVED' ? 'text-green-400' : p.status === 'PENDING' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-gray-500">{formatDate(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono font-bold flex items-center gap-2 text-green-400">
                <Eye className="w-4 h-4" />
                [SITE_TRAFFIC]
              </h2>
              <div className="flex gap-2">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setAnalyticsDays(d)}
                    className={`px-3 py-1.5 text-xs font-mono ${
                      analyticsDays === d ? 'bg-green-600/20 text-green-400 border border-green-500/50' : 'border border-green-500/20 text-gray-600 hover:text-green-400'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black border border-green-500/20 p-5">
                <Eye className="w-4 h-4 text-green-500 mb-2" />
                <p className="text-xl font-bold font-mono">{analytics.totalViews}</p>
                <p className="text-gray-600 text-xs font-mono">page_views</p>
              </div>
              <div className="bg-black border border-green-500/20 p-5">
                <Users className="w-4 h-4 text-green-500 mb-2" />
                <p className="text-xl font-bold font-mono">{analytics.uniqueSessions}</p>
                <p className="text-gray-600 text-xs font-mono">unique_sessions</p>
              </div>
            </div>

            {/* Daily chart (simple bar) */}
            {analytics.dailyViews.length > 0 && (
              <div className="bg-black border border-green-500/20 p-5">
                <h3 className="text-xs font-mono font-bold mb-4 flex items-center gap-2 text-green-400">
                  <TrendingUp className="w-3.5 h-3.5" /> [DAILY_VIEWS]
                </h3>
                <div className="flex items-end gap-1 h-32">
                  {analytics.dailyViews.map((d, i) => {
                    const max = Math.max(...analytics.dailyViews.map((v) => v.views), 1);
                    const height = (d.views / max) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-600 font-mono">{d.views}</span>
                        <div
                          className="w-full bg-green-500 min-h-[2px]"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-[10px] text-gray-600">
                          {new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top pages */}
            <div className="bg-black border border-green-500/20 p-5">
              <h3 className="text-xs font-mono font-bold mb-3 flex items-center gap-2 text-green-400">
                <Globe className="w-3.5 h-3.5" /> [TOP_PAGES]
              </h3>
              <div className="space-y-2">
                {analytics.topPages.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-white">{p.path}</span>
                    <span className="text-sm text-gray-400 font-semibold">{p.views}</span>
                  </div>
                ))}
                {analytics.topPages.length === 0 && (
                  <p className="text-gray-600 text-sm">Nenhum dado de tráfego ainda.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUPPORT TAB */}
        {activeTab === 'support' && (
          <AdminSupportTab />
        )}
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
  };

  return (
    <div className="bg-black border border-green-500/20 p-4 sm:p-5">
      <Icon className={`w-4 h-4 ${colorMap[color] || 'text-gray-600'} mb-2`} />
      <p className="text-lg sm:text-xl font-bold text-white font-mono">{value}</p>
      <p className="text-gray-600 text-xs font-mono">{label}</p>
      <p className={`text-[10px] mt-1 font-mono ${colorMap[color] || 'text-gray-600'}`}>{sub}</p>
    </div>
  );
}
