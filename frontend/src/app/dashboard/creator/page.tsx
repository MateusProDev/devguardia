'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Terminal, LogOut, ShoppingBag, Package, Settings, Heart, Loader2,
  Plus, Edit, Eye, EyeOff, Trash2, CheckCircle, XCircle, AlertCircle,
  Copy, Check, ChevronRight, User, BookOpen
} from 'lucide-react';
import { onAuthStateChanged, User as FBUser } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { signOut } from '../../../services/auth';
import {
  marketplaceApi, Creator, Product, Purchase, Contribution,
  piconeroToXmr, centsToBrl, TIER_AMOUNTS, ContributionTier, PaymentMethod
} from '../../../services/marketplace';
import ImageUpload from '../../../components/ImageUpload';

const TABS = [
  { id: 'products', label: 'PRODUTOS', icon: Package },
  { id: 'sales', label: 'VENDAS', icon: ShoppingBag },
  { id: 'settings', label: 'CONFIGURAÇÕES', icon: Settings },
  { id: 'contribute', label: 'CONTRIBUIR', icon: Heart },
];

function CreatorDashboardPage({ activeTab }: { activeTab: string }) {
  const router = useRouter();

  const [user, setUser] = useState<FBUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [creatorLoading, setCreatorLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u ?? null);
      setAuthChecked(true);
      if (u) {
        try {
          const c = await marketplaceApi.getMyProfile();
          setCreator(c);
        } catch {
          setCreator(null);
        } finally {
          setCreatorLoading(false);
        }
      } else {
        setCreatorLoading(false);
      }
    });
    return () => unsub();
  }, []);

  function setTab(tab: string) {
    router.push(`/dashboard/creator?tab=${tab}`);
  }

  async function handleSignOut() {
    await signOut();
    router.push('/dashboard');
  }

  if (!authChecked || creatorLoading) {
    return (
      <div className="min-h-screen bg-black matrix-bg flex items-center justify-center">
        <div className="flex items-center gap-3 text-green-500 font-mono text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>INICIALIZANDO<span className="animate-blink">_</span></span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black matrix-bg flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-sm text-gray-500 mb-4">// Acesso restrito</p>
          <Link href="/dashboard" className="btn-primary">LOGIN →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black matrix-bg">
      {/* Navbar */}
      <nav className="border-b border-green-900/30 px-4 sm:px-6 py-4 bg-black/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                <Terminal className="w-4 h-4 text-green-500" />
              </div>
              <span className="font-bold text-sm tracking-wider font-mono">
                DEV<span className="text-green-500">GUARD</span>
              </span>
            </Link>
            <span className="text-gray-700 font-mono text-xs hidden sm:block">/ MARKETPLACE</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/marketplace" className="text-gray-600 hover:text-green-400 font-mono text-xs transition-colors">
              [LOJA]
            </Link>
            <span className="text-gray-700 text-xs font-mono hidden sm:block truncate max-w-[150px]">{user.email}</span>
            <button onClick={handleSignOut} className="text-gray-600 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="border-b border-green-500/10 bg-black/60 sticky top-[61px] z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-mono border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-gray-600 hover:text-gray-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* No creator profile yet */}
        {!creator && activeTab !== 'settings' && (
          <div className="card text-center py-12 mb-6">
            <User className="w-10 h-10 text-green-500/20 mx-auto mb-4" />
            <p className="font-mono text-sm text-gray-500 mb-2">// Perfil de vendedor não configurado</p>
            <p className="font-mono text-xs text-gray-700 mb-5">Configure seu perfil antes de criar produtos</p>
            <button onClick={() => setTab('settings')} className="btn-primary">
              CRIAR_PERFIL →
            </button>
          </div>
        )}

        {activeTab === 'products' && creator && (
          <ProductsTab creator={creator} />
        )}
        {activeTab === 'sales' && creator && (
          <SalesTab />
        )}
        {activeTab === 'settings' && (
          <SettingsTab creator={creator} onSaved={setCreator} />
        )}
        {activeTab === 'contribute' && (
          <ContributeTab />
        )}
      </div>
    </div>
  );
}

function CreatorDashboardInner() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'products';
  return <CreatorDashboardPage activeTab={activeTab} />;
}

export default function CreatorDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black matrix-bg flex items-center justify-center">
        <div className="flex items-center gap-3 text-green-500 font-mono text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>INICIALIZANDO<span className="animate-blink">_</span></span>
        </div>
      </div>
    }>
      <CreatorDashboardInner />
    </Suspense>
  );
}

// ─── Products Tab ─────────────────────────────────────────────────────────────

function ProductsTab({ creator }: { creator: Creator }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await marketplaceApi.listMyProducts();
      setProducts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function handlePublishToggle(p: Product) {
    try {
      await marketplaceApi.publishProduct(p.id, p.status !== 'PUBLISHED');
      reload();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Excluir "${p.title}"?`)) return;
    try {
      await marketplaceApi.deleteProduct(p.id);
      reload();
    } catch (e: any) {
      alert(e.message);
    }
  }

  const statusColor: Record<string, string> = {
    DRAFT: 'text-yellow-500',
    PUBLISHED: 'text-green-400',
    ARCHIVED: 'text-gray-600',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono font-bold text-lg">&lt;MEUS_PRODUTOS/&gt;</h2>
          <p className="text-gray-600 text-xs font-mono mt-1">// {products.length} produto(s)</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          NOVO
        </button>
      </div>

      {showForm && (
        <ProductForm onCreated={() => { setShowForm(false); reload(); }} />
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-green-500" />
        </div>
      ) : products.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-8 h-8 text-green-500/20 mx-auto mb-3" />
          <p className="font-mono text-xs text-gray-600">// Nenhum produto ainda. Crie o primeiro!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="border border-green-500/15 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-gray-200">{p.title}</span>
                  <span className={`text-xs font-mono ${statusColor[p.status] ?? 'text-gray-600'}`}>
                    [{p.status}]
                  </span>
                  <span className="text-xs font-mono text-gray-700 bg-gray-800/50 px-1.5 py-0.5">
                    {p.type}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs font-mono text-gray-700">
                  {p.acceptsXmr && p.priceXmrPiconero && (
                    <span className="text-orange-400/70">ɱ {piconeroToXmr(p.priceXmrPiconero)}</span>
                  )}
                  {p.acceptsPix && p.pricePixBrlCents && (
                    <span className="text-blue-400/70">{centsToBrl(p.pricePixBrlCents)}</span>
                  )}
                  <span>{p._count?.purchases ?? 0} venda(s)</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/dashboard/creator/products/${p.id}`}
                  className="flex items-center gap-1 text-xs font-mono text-gray-600 hover:text-green-400 border border-gray-800 hover:border-green-500/30 px-3 py-1.5 transition-all"
                >
                  <Edit className="w-3 h-3" />
                  EDITAR
                </Link>
                <button
                  onClick={() => handlePublishToggle(p)}
                  className="flex items-center gap-1 text-xs font-mono text-gray-600 hover:text-yellow-400 border border-gray-800 hover:border-yellow-500/30 px-3 py-1.5 transition-all"
                >
                  {p.status === 'PUBLISHED' ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {p.status === 'PUBLISHED' ? 'DESPUBLICAR' : 'PUBLICAR'}
                </button>
                {p.status !== 'PUBLISHED' && (
                  <button
                    onClick={() => handleDelete(p)}
                    className="flex items-center gap-1 text-xs font-mono text-gray-700 hover:text-red-400 border border-gray-800 hover:border-red-500/30 px-3 py-1.5 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                {p.status === 'PUBLISHED' && (
                  <Link
                    href={`/marketplace/${p.slug}`}
                    target="_blank"
                    className="flex items-center gap-1 text-xs font-mono text-gray-600 hover:text-green-400 border border-gray-800 hover:border-green-500/30 px-3 py-1.5 transition-all"
                  >
                    <Eye className="w-3 h-3" />
                    VER
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    type: 'COURSE',
    slug: '',
    title: '',
    shortDescription: '',
    description: '',
    coverImageUrl: '',
    priceXmrPiconero: '',
    pricePixBrlCents: '',
    acceptsXmr: true,
    acceptsPix: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await marketplaceApi.createProduct({
        ...form,
        type: form.type as Product['type'],
        slug: form.slug.toLowerCase().trim(),
        priceXmrPiconero: form.priceXmrPiconero ? form.priceXmrPiconero : undefined,
        pricePixBrlCents: form.pricePixBrlCents ? parseInt(form.pricePixBrlCents) : undefined,
      });
      onCreated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-green-500/20 p-5 space-y-4 bg-green-500/5">
      <p className="text-xs font-mono text-green-400">// NOVO_PRODUTO</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-mono text-gray-600 mb-1 block">TIPO</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="input-field text-sm"
          >
            <option value="COURSE">Curso</option>
            <option value="EBOOK">E-book</option>
            <option value="MENTORSHIP">Mentoria</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-mono text-gray-600 mb-1 block">SLUG (URL)</label>
          <input
            required
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="meu-produto"
            className="input-field text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-mono text-gray-600 mb-1 block">TÍTULO</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Título do produto"
            className="input-field text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-mono text-gray-600 mb-1 block">DESCRIÇÃO CURTA</label>
          <input
            value={form.shortDescription}
            onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
            placeholder="Uma linha sobre o produto"
            className="input-field text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-mono text-gray-600 mb-1 block">DESCRIÇÃO COMPLETA</label>
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descreva o produto em detalhes..."
            className="input-field text-sm resize-none"
          />
        </div>
        <div className="sm:col-span-2">
          <ImageUpload
            label="IMAGEM_DE_CAPA (opcional)"
            aspectHint="16:9 recomendado"
            currentUrl={form.coverImageUrl}
            onUploaded={(url) => setForm({ ...form, coverImageUrl: url })}
            onRemove={() => setForm({ ...form, coverImageUrl: '' })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="flex items-center gap-2 text-xs font-mono text-gray-600 mb-2 cursor-pointer">
            <input type="checkbox" checked={form.acceptsXmr} onChange={(e) => setForm({ ...form, acceptsXmr: e.target.checked })} />
            ACEITA MONERO (XMR)
          </label>
          {form.acceptsXmr && (
            <input
              value={form.priceXmrPiconero}
              onChange={(e) => setForm({ ...form, priceXmrPiconero: e.target.value })}
              placeholder="Valor em piconero (1 XMR = 1e12)"
              className="input-field text-sm"
            />
          )}
        </div>
        <div>
          <label className="flex items-center gap-2 text-xs font-mono text-gray-600 mb-2 cursor-pointer">
            <input type="checkbox" checked={form.acceptsPix} onChange={(e) => setForm({ ...form, acceptsPix: e.target.checked })} />
            ACEITA PIX (BRL)
          </label>
          {form.acceptsPix && (
            <input
              value={form.pricePixBrlCents}
              onChange={(e) => setForm({ ...form, pricePixBrlCents: e.target.value })}
              placeholder="Valor em centavos (ex: 4990)"
              className="input-field text-sm"
            />
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs font-mono">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          CRIAR_PRODUTO
        </button>
        <button type="button" onClick={onCreated} className="btn-outline">CANCELAR</button>
      </div>
    </form>
  );
}

// ─── Sales Tab ─────────────────────────────────────────────────────────────────

function SalesTab() {
  const [sales, setSales] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await marketplaceApi.listMySales(filter !== 'ALL' ? filter : undefined);
      setSales(data);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { reload(); }, [reload]);

  async function handleConfirm(id: string) {
    try {
      await marketplaceApi.confirmSale(id, {});
      reload();
    } catch (e: any) { alert(e.message); }
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancelar esta venda?')) return;
    try {
      await marketplaceApi.cancelPurchase(id);
      reload();
    } catch (e: any) { alert(e.message); }
  }

  const statusColor: Record<string, string> = {
    PENDING: 'text-gray-600',
    WAITING_CONFIRMATION: 'text-yellow-500',
    CONFIRMED: 'text-green-400',
    CANCELLED: 'text-red-400',
    EXPIRED: 'text-gray-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-mono font-bold text-lg">&lt;MINHAS_VENDAS/&gt;</h2>
          <p className="text-gray-600 text-xs font-mono mt-1">// {sales.length} venda(s)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'WAITING_CONFIRMATION', 'CONFIRMED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs font-mono px-3 py-1.5 border transition-all ${
                filter === s
                  ? 'border-green-500/50 bg-green-500/10 text-green-400'
                  : 'border-gray-800 text-gray-600 hover:text-gray-400'
              }`}
            >
              {s === 'ALL' ? 'TODAS' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-green-500" />
        </div>
      ) : sales.length === 0 ? (
        <div className="card text-center py-12">
          <ShoppingBag className="w-8 h-8 text-green-500/20 mx-auto mb-3" />
          <p className="font-mono text-xs text-gray-600">// Nenhuma venda encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sales.map((s) => (
            <div key={s.id} className="border border-green-500/15 p-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-gray-200 truncate">
                      {s.product?.title ?? s.productId}
                    </span>
                    <span className={`text-xs font-mono ${statusColor[s.status] ?? 'text-gray-600'}`}>
                      [{s.status.replace(/_/g, ' ')}]
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-gray-700 flex-wrap">
                    <span>{s.paymentMethod}</span>
                    {s.amountXmrPiconero && (
                      <span className="text-orange-400/70">ɱ {piconeroToXmr(s.amountXmrPiconero)}</span>
                    )}
                    {s.amountPixBrlCents && (
                      <span className="text-blue-400/70">{centsToBrl(s.amountPixBrlCents)}</span>
                    )}
                    <span>{new Date(s.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {s.txReference && (
                    <p className="text-xs font-mono text-gray-700">TX: {s.txReference}</p>
                  )}
                  {s.proofUrl && (
                    <a href={s.proofUrl} target="_blank" rel="noreferrer"
                      className="text-xs font-mono text-blue-400 hover:underline">
                      [VER_COMPROVANTE]
                    </a>
                  )}
                </div>
                {s.status === 'WAITING_CONFIRMATION' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConfirm(s.id)}
                      className="flex items-center gap-1 text-xs font-mono text-green-400 border border-green-500/30 hover:bg-green-500/10 px-3 py-1.5 transition-all"
                    >
                      <CheckCircle className="w-3 h-3" /> CONFIRMAR
                    </button>
                    <button
                      onClick={() => handleCancel(s.id)}
                      className="flex items-center gap-1 text-xs font-mono text-red-400 border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 transition-all"
                    >
                      <XCircle className="w-3 h-3" /> CANCELAR
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ creator, onSaved }: { creator: Creator | null; onSaved: (c: Creator) => void }) {
  const [profileForm, setProfileForm] = useState({
    slug: creator?.slug ?? '',
    displayName: creator?.displayName ?? '',
    bio: creator?.bio ?? '',
    avatarUrl: creator?.avatarUrl ?? '',
    acceptedTerms: true,
  });
  const [payForm, setPayForm] = useState({
    moneroAddress: '',
    pixKey: '',
    pixKeyType: 'CPF',
    pixHolderName: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [payError, setPayError] = useState('');
  const [profileOk, setProfileOk] = useState(false);
  const [payOk, setPayOk] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileOk(false);
    try {
      const saved = await marketplaceApi.upsertMyProfile({
        ...profileForm,
        slug: profileForm.slug.toLowerCase().trim(),
      });
      onSaved(saved);
      setProfileOk(true);
    } catch (e: any) {
      setProfileError(e.message);
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePaySave(e: React.FormEvent) {
    e.preventDefault();
    setPayLoading(true);
    setPayError('');
    setPayOk(false);
    try {
      await marketplaceApi.updatePaymentConfig({
        moneroAddress: payForm.moneroAddress || undefined,
        pixKey: payForm.pixKey || undefined,
        pixKeyType: payForm.pixKeyType || undefined,
        pixHolderName: payForm.pixHolderName || undefined,
      });
      setPayOk(true);
    } catch (e: any) {
      setPayError(e.message);
    } finally {
      setPayLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="font-mono font-bold text-lg">&lt;CONFIGURAÇÕES/&gt;</h2>

      {/* Profile form */}
      <form onSubmit={handleProfileSave} className="card space-y-4">
        <p className="text-xs font-mono text-green-400">// PERFIL_DO_VENDEDOR</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-mono text-gray-600 mb-1 block">SLUG (URL única)</label>
            <input
              required
              value={profileForm.slug}
              onChange={(e) => setProfileForm({ ...profileForm, slug: e.target.value })}
              placeholder="meu-perfil"
              className="input-field text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-gray-600 mb-1 block">NOME DE EXIBIÇÃO</label>
            <input
              required
              value={profileForm.displayName}
              onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
              placeholder="Seu nome"
              className="input-field text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-mono text-gray-600 mb-1 block">BIO</label>
            <textarea
              rows={3}
              value={profileForm.bio}
              onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
              placeholder="Sobre você..."
              className="input-field text-sm resize-none"
            />
          </div>
          <div className="sm:col-span-2">
            <ImageUpload
              label="AVATAR (opcional)"
              aspectHint="quadrado, 200x200+"
              currentUrl={profileForm.avatarUrl}
              onUploaded={(url) => setProfileForm({ ...profileForm, avatarUrl: url })}
              onRemove={() => setProfileForm({ ...profileForm, avatarUrl: '' })}
            />
          </div>
        </div>
        {profileError && (
          <div className="flex items-center gap-2 text-red-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4" /> {profileError}
          </div>
        )}
        {profileOk && (
          <p className="text-green-400 text-xs font-mono">✓ Perfil salvo</p>
        )}
        <button type="submit" disabled={profileLoading} className="btn-primary flex items-center gap-2">
          {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          SALVAR_PERFIL
        </button>
      </form>

      {/* Payment config form */}
      <form onSubmit={handlePaySave} className="card space-y-4">
        <p className="text-xs font-mono text-green-400">// CONFIGURAÇÃO_DE_PAGAMENTO</p>
        <p className="text-xs font-mono text-gray-700">
          // Os compradores pagam diretamente para você. Configure ao menos um método.
        </p>

        <div className="space-y-3">
          <p className="text-xs font-mono text-orange-400">MONERO (XMR)</p>
          <div>
            <label className="text-xs font-mono text-gray-600 mb-1 block">ENDEREÇO MONERO</label>
            <input
              value={payForm.moneroAddress}
              onChange={(e) => setPayForm({ ...payForm, moneroAddress: e.target.value })}
              placeholder="4... (endereço padrão)"
              className="input-field text-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-mono text-blue-400">PIX</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-gray-600 mb-1 block">TIPO DA CHAVE</label>
              <select
                value={payForm.pixKeyType}
                onChange={(e) => setPayForm({ ...payForm, pixKeyType: e.target.value })}
                className="input-field text-sm"
              >
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="EMAIL">E-mail</option>
                <option value="PHONE">Telefone</option>
                <option value="RANDOM">Aleatória</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-mono text-gray-600 mb-1 block">CHAVE PIX</label>
              <input
                value={payForm.pixKey}
                onChange={(e) => setPayForm({ ...payForm, pixKey: e.target.value })}
                placeholder="Sua chave PIX"
                className="input-field text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-mono text-gray-600 mb-1 block">NOME DO FAVORECIDO</label>
              <input
                value={payForm.pixHolderName}
                onChange={(e) => setPayForm({ ...payForm, pixHolderName: e.target.value })}
                placeholder="Como aparece no PIX"
                className="input-field text-sm"
              />
            </div>
          </div>
        </div>

        {payError && (
          <div className="flex items-center gap-2 text-red-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4" /> {payError}
          </div>
        )}
        {payOk && (
          <p className="text-green-400 text-xs font-mono">✓ Pagamentos configurados</p>
        )}
        <button type="submit" disabled={payLoading} className="btn-primary flex items-center gap-2">
          {payLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          SALVAR_PAGAMENTOS
        </button>
      </form>
    </div>
  );
}

// ─── Contribute Tab ─────────────────────────────────────────────────────────────

const TIERS: { id: ContributionTier; brl: number; label: string; desc: string }[] = [
  { id: 'TIER_10', brl: 10, label: 'APOIADOR', desc: 'Contribuição básica mensal' },
  { id: 'TIER_20', brl: 20, label: 'COLABORADOR', desc: 'Contribuição moderada mensal' },
  { id: 'TIER_30', brl: 30, label: 'PARCEIRO', desc: 'Contribuição avançada mensal' },
  { id: 'TIER_50', brl: 50, label: 'PATRONO', desc: 'Contribuição premium mensal' },
];

function ContributeTab() {
  const [selected, setSelected] = useState<ContributionTier>('TIER_10');
  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [loading, setLoading] = useState(false);
  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [error, setError] = useState('');
  const [txRef, setTxRef] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimOk, setClaimOk] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<Contribution[]>([]);

  useEffect(() => {
    marketplaceApi.listMyContributions().then(setHistory).catch(() => {});
  }, []);

  async function handleCreate() {
    setLoading(true);
    setError('');
    try {
      const c = await marketplaceApi.createContribution({ tier: selected, paymentMethod: method });
      setContribution(c);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim() {
    if (!contribution) return;
    setClaimLoading(true);
    try {
      await marketplaceApi.claimContribution(contribution.id, { txReference: txRef || undefined });
      setClaimOk(true);
      const h = await marketplaceApi.listMyContributions();
      setHistory(h);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setClaimLoading(false);
    }
  }

  function copyText(t: string) {
    navigator.clipboard.writeText(t);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const instr = contribution?.paymentInstructions;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-mono font-bold text-lg">&lt;CONTRIBUIR_COM_A_PLATAFORMA/&gt;</h2>
        <p className="text-gray-600 text-xs font-mono mt-1">
          // Contribuição mensal voluntária. Ajude a manter a plataforma viva.
        </p>
      </div>

      {claimOk ? (
        <div className="card text-center py-10 space-y-3">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
          <p className="font-mono text-green-400">CONTRIBUIÇÃO_REGISTRADA</p>
          <p className="text-xs font-mono text-gray-600">// Obrigado! Nossa equipe confirmará em breve.</p>
        </div>
      ) : !contribution ? (
        <div className="card space-y-5">
          <p className="text-xs font-mono text-green-500/40">// ESCOLHA_O_TIER</p>
          <div className="grid grid-cols-2 gap-3">
            {TIERS.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`p-4 border text-left transition-all ${
                  selected === t.id
                    ? 'border-green-500/60 bg-green-500/10 text-green-400'
                    : 'border-gray-800 text-gray-600 hover:border-green-500/20'
                }`}
              >
                <p className="font-mono font-bold text-sm">{t.label}</p>
                <p className="font-mono text-lg font-bold mt-1">R$ {t.brl}/mês</p>
                <p className="text-xs font-mono opacity-70 mt-1">{t.desc}</p>
              </button>
            ))}
          </div>

          <div>
            <p className="text-xs font-mono text-gray-600 mb-2">// MÉTODO</p>
            <div className="flex gap-2">
              <button
                onClick={() => setMethod('PIX')}
                className={`px-4 py-2 text-xs font-mono border transition-all ${
                  method === 'PIX' ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-gray-800 text-gray-600'
                }`}
              >
                PIX
              </button>
              <button
                onClick={() => setMethod('XMR')}
                className={`px-4 py-2 text-xs font-mono border transition-all ${
                  method === 'XMR' ? 'border-orange-500/50 bg-orange-500/10 text-orange-400' : 'border-gray-800 text-gray-600'
                }`}
              >
                MONERO
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-mono">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          <button onClick={handleCreate} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            CONTRIBUIR →
          </button>
        </div>
      ) : (
        <div className="card space-y-4">
          <p className="text-xs font-mono text-green-400">// INSTRUÇÕES_DE_PAGAMENTO</p>

          {instr?.method === 'PIX' && (
            <div className="space-y-3">
              <div className="border border-blue-500/20 p-3 bg-blue-500/5">
                <p className="text-xs font-mono text-blue-500/60 mb-1">[CHAVE_PIX]</p>
                <p className="font-mono text-sm text-gray-300">{instr.pixKey}</p>
                <button onClick={() => copyText(instr.pixKey)} className="mt-1 flex items-center gap-1 text-xs font-mono text-blue-400">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'COPIADO' : 'COPIAR'}
                </button>
              </div>
              <div className="border border-blue-500/20 p-3 bg-blue-500/5">
                <p className="text-xs font-mono text-blue-500/60 mb-1">[VALOR]</p>
                <p className="font-mono text-lg text-blue-400">R$ {TIER_AMOUNTS[selected]},00</p>
              </div>
            </div>
          )}

          {instr?.method === 'XMR' && (
            <div className="space-y-3">
              <div className="border border-orange-500/20 p-3 bg-orange-500/5">
                <p className="text-xs font-mono text-orange-500/60 mb-1">[ENDEREÇO_MONERO_DA_PLATAFORMA]</p>
                <p className="font-mono text-xs text-gray-300 break-all">{instr.moneroAddress}</p>
                <button onClick={() => copyText(instr.moneroAddress)} className="mt-1 flex items-center gap-1 text-xs font-mono text-orange-400">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'COPIADO' : 'COPIAR'}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-mono text-gray-600 mb-1 block">TX_HASH / COMPROVANTE (opcional)</label>
            <input
              value={txRef}
              onChange={(e) => setTxRef(e.target.value)}
              placeholder="ID da transação"
              className="input-field text-sm"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-mono">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          <button onClick={handleClaim} disabled={claimLoading} className="btn-primary flex items-center gap-2">
            {claimLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            JÁ_PAGUEI →
          </button>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="card space-y-3">
          <p className="text-xs font-mono text-green-500/40">// HISTÓRICO</p>
          {history.map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-green-500/10 pb-2 last:border-0 last:pb-0">
              <div className="space-y-0.5">
                <p className="text-xs font-mono text-gray-400">
                  {TIERS.find((t) => t.id === c.tier)?.label ?? c.tier} · {c.paymentMethod}
                </p>
                <p className="text-xs font-mono text-gray-700">
                  {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <span className={`text-xs font-mono ${
                c.status === 'CONFIRMED' ? 'text-green-400' :
                c.status === 'WAITING_CONFIRMATION' ? 'text-yellow-500' : 'text-gray-600'
              }`}>
                [{c.status.replace(/_/g, ' ')}]
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
