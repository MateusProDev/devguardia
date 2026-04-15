'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { api } from '../../services/api';
import {
  Shield, Users, Scan, AlertTriangle, DollarSign, Eye,
  Loader2, LogOut, TrendingUp, CreditCard, Activity,
  BarChart3, Globe, Clock,
} from 'lucide-react';

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
  LOW: 'text-blue-400',
  INFO: 'text-gray-400',
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'text-green-400',
  RUNNING: 'text-yellow-400',
  QUEUED: 'text-blue-400',
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
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'scans' | 'payments' | 'analytics'>('overview');
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Shield className="w-8 h-8 text-blue-500" />
            <span className="text-xl font-bold">DevGuard Admin</span>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loginLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <Shield className="w-12 h-12 text-red-500" />
        <p className="text-red-400 text-lg font-semibold">Acesso negado</p>
        <p className="text-gray-500 text-sm">{error}</p>
        <button onClick={handleLogout} className="text-blue-400 hover:underline text-sm">
          Sair e tentar com outra conta
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
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <nav className="border-b border-gray-800 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            <span className="font-bold">DevGuard Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={fetchAll} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
              <Activity className="w-4 h-4" /> Atualizar
            </button>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 text-sm flex items-center gap-1">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="border-b border-gray-800 px-4 sm:px-6 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
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
              <Card icon={Users} label="Usuários" value={stats.users.total} sub={`+${stats.users.today} hoje`} color="blue" />
              <Card icon={Scan} label="Scans" value={stats.scans.total} sub={`+${stats.scans.today} hoje`} color="green" />
              <Card icon={AlertTriangle} label="Vulnerabilidades" value={stats.vulnerabilities.total} sub="identificadas" color="yellow" />
              <Card icon={DollarSign} label="Receita Total" value={formatBRL(stats.revenue.totalCents)} sub={`${stats.revenue.totalPayments} pagamentos`} color="emerald" />
            </div>

            {/* Revenue details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-gray-500 text-sm mb-1">Scan Avulso</p>
                <p className="text-xl font-bold text-white">{formatBRL(stats.revenue.singleScanCents)}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-gray-500 text-sm mb-1">Assinaturas</p>
                <p className="text-xl font-bold text-white">{formatBRL(stats.revenue.subscriptionCents)}</p>
                <p className="text-xs text-green-400 mt-1">{stats.revenue.activeSubscriptions} ativas</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-gray-500 text-sm mb-1">Receita este mês</p>
                <p className="text-xl font-bold text-white">{formatBRL(stats.revenue.thisMonthCents)}</p>
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
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" /> Vulnerabilidades por Severidade
                </h3>
                <div className="space-y-2">
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map((sev) => {
                    const count = stats.vulnerabilities.bySeverity[sev] || 0;
                    const pct = stats.vulnerabilities.total > 0 ? (count / stats.vulnerabilities.total) * 100 : 0;
                    return (
                      <div key={sev} className="flex items-center gap-3">
                        <span className={`text-xs font-bold w-16 ${SEVERITY_COLORS[sev]}`}>{sev}</span>
                        <div className="flex-1 bg-gray-800 rounded-full h-2">
                          <div className={`h-2 rounded-full ${sev === 'CRITICAL' ? 'bg-red-500' : sev === 'HIGH' ? 'bg-orange-500' : sev === 'MEDIUM' ? 'bg-yellow-500' : sev === 'LOW' ? 'bg-blue-500' : 'bg-gray-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm text-gray-400 w-10 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" /> Scans por Status
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
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-400" /> Tráfego (últimos {analyticsDays} dias)
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
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Usuários Recentes ({stats.users.total} total)
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
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Scan className="w-5 h-5 text-green-400" />
              Scans Recentes ({stats.scans.total} total)
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
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Pagamentos Recentes
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
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          p.type === 'SUBSCRIPTION' ? 'bg-purple-900 text-purple-300' : 'bg-blue-900 text-blue-300'
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
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-400" />
                Tráfego do Site
              </h2>
              <div className="flex gap-2">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setAnalyticsDays(d)}
                    className={`px-3 py-1.5 text-xs rounded-lg ${
                      analyticsDays === d ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <Eye className="w-5 h-5 text-purple-400 mb-2" />
                <p className="text-2xl font-bold">{analytics.totalViews}</p>
                <p className="text-gray-500 text-sm">Page views</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <Users className="w-5 h-5 text-blue-400 mb-2" />
                <p className="text-2xl font-bold">{analytics.uniqueSessions}</p>
                <p className="text-gray-500 text-sm">Sessões únicas</p>
              </div>
            </div>

            {/* Daily chart (simple bar) */}
            {analytics.dailyViews.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" /> Views por Dia
                </h3>
                <div className="flex items-end gap-1 h-32">
                  {analytics.dailyViews.map((d, i) => {
                    const max = Math.max(...analytics.dailyViews.map((v) => v.views), 1);
                    const height = (d.views / max) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500">{d.views}</span>
                        <div
                          className="w-full bg-blue-500 rounded-t min-h-[2px]"
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
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" /> Páginas Mais Visitadas
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
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5">
      <Icon className={`w-5 h-5 ${colorMap[color] || 'text-gray-400'} mb-2`} />
      <p className="text-lg sm:text-2xl font-bold text-white">{value}</p>
      <p className="text-gray-500 text-xs sm:text-sm">{label}</p>
      <p className={`text-xs mt-1 ${colorMap[color] || 'text-gray-500'}`}>{sub}</p>
    </div>
  );
}
