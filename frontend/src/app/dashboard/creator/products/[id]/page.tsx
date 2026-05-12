'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Terminal, Loader2, Plus, Trash2, Edit, Check,
  X, GripVertical, Play, FileText, BookOpen, AlertCircle, Save,
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../../../lib/firebase';
import { marketplaceApi, Product, Module, Lesson, piconeroToXmr, centsToBrl } from '../../../../../services/marketplace';
import ImageUpload from '../../../../../components/ImageUpload';

export default function ProductBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authOk, setAuthOk] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setAuthOk(!!u));
    return () => unsub();
  }, []);

  const reload = useCallback(async () => {
    if (!authOk) return;
    setLoading(true);
    try {
      const detail = await marketplaceApi.getMyProduct(id);
      setProduct(detail);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, authOk]);

  useEffect(() => { reload(); }, [reload]);

  if (!authOk || loading) {
    return (
      <div className="min-h-screen bg-black matrix-bg flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-green-500" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-black matrix-bg flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="font-mono text-sm text-red-400">{error || 'Produto não encontrado'}</p>
          <Link href="/dashboard/creator" className="btn-outline mt-4 inline-block">← [VOLTAR]</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black matrix-bg">
      {/* Navbar */}
      <nav className="border-b border-green-900/30 px-4 sm:px-6 py-4 bg-black/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <Link
            href="/dashboard/creator"
            className="flex items-center gap-2 text-gray-600 hover:text-green-400 font-mono text-xs transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            [VOLTAR]
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500/20 border border-green-500/50 flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5 text-green-500" />
            </div>
            <span className="font-bold text-xs tracking-wider font-mono">
              DEV<span className="text-green-500">GUARD</span>
            </span>
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Product header */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-mono text-green-500/40 mb-1">// EDITOR_DE_PRODUTO</p>
              <h1 className="font-mono font-bold text-xl">{product.title}</h1>
              <div className="flex items-center gap-3 mt-2 text-xs font-mono text-gray-600 flex-wrap">
                <span>[{product.type}]</span>
                <span className={product.status === 'PUBLISHED' ? 'text-green-400' : 'text-yellow-500'}>
                  [{product.status}]
                </span>
                {product.acceptsXmr && product.priceXmrPiconero && (
                  <span className="text-orange-400/70">ɱ {piconeroToXmr(product.priceXmrPiconero)}</span>
                )}
                {product.acceptsPix && product.pricePixBrlCents && (
                  <span className="text-blue-400/70">{centsToBrl(product.pricePixBrlCents)}</span>
                )}
              </div>
            </div>
            <EditProductInline product={product} onSaved={reload} />
          </div>
        </div>

        {/* Course builder — only for COURSE type */}
        {product.type === 'COURSE' && (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-green-500/40">// MÓDULOS_E_AULAS</p>
              <AddModuleInline productId={product.id} onAdded={reload} />
            </div>

            {(!product.modules || product.modules.length === 0) ? (
              <div className="text-center py-8 border border-green-500/10">
                <BookOpen className="w-8 h-8 text-green-500/20 mx-auto mb-3" />
                <p className="font-mono text-xs text-gray-600">// Adicione módulos para organizar o conteúdo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {product.modules.map((mod) => (
                  <ModuleBlock key={mod.id} module={mod} onChanged={reload} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* For EBOOK / MENTORSHIP — show simple content block */}
        {product.type !== 'COURSE' && (
          <div className="card">
            <p className="text-xs font-mono text-green-500/40 mb-3">// CONTEÚDO</p>
            <p className="text-gray-600 text-xs font-mono">
              {product.type === 'EBOOK'
                ? '// Para e-books, após a compra você entrega o arquivo via link ou manualmente.'
                : '// Para mentorias, combine as sessões diretamente com os compradores.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit product inline ───────────────────────────────────────────────────────

function EditProductInline({ product, onSaved }: { product: Product; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: product.title,
    shortDescription: product.shortDescription ?? '',
    description: product.description,
    coverImageUrl: product.coverImageUrl ?? '',
    priceXmrPiconero: product.priceXmrPiconero ?? '',
    pricePixBrlCents: product.pricePixBrlCents ? String(product.pricePixBrlCents) : '',
    acceptsXmr: product.acceptsXmr,
    acceptsPix: product.acceptsPix,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await marketplaceApi.updateProduct(product.id, {
        ...form,
        priceXmrPiconero: form.priceXmrPiconero || undefined,
        pricePixBrlCents: form.pricePixBrlCents ? parseInt(form.pricePixBrlCents) : undefined,
      });
      setOpen(false);
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline flex items-center gap-2 text-xs">
        <Edit className="w-3.5 h-3.5" /> EDITAR
      </button>
    );
  }

  return (
    <form onSubmit={save} className="w-full mt-4 space-y-3 border-t border-green-500/10 pt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs font-mono text-gray-600 mb-1 block">TÍTULO</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-mono text-gray-600 mb-1 block">DESCRIÇÃO CURTA</label>
          <input value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} className="input-field text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-mono text-gray-600 mb-1 block">DESCRIÇÃO COMPLETA</label>
          <textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field text-sm resize-none" />
        </div>
        <div className="sm:col-span-2">
          <ImageUpload
            label="IMAGEM_DE_CAPA"
            aspectHint="16:9 recomendado"
            currentUrl={form.coverImageUrl}
            onUploaded={(url) => setForm({ ...form, coverImageUrl: url })}
            onRemove={() => setForm({ ...form, coverImageUrl: '' })}
          />
        </div>
        <div>
          <label className="flex items-center gap-2 text-xs font-mono text-gray-600 mb-1 cursor-pointer">
            <input type="checkbox" checked={form.acceptsXmr} onChange={(e) => setForm({ ...form, acceptsXmr: e.target.checked })} />
            MONERO
          </label>
          {form.acceptsXmr && (
            <input value={form.priceXmrPiconero} onChange={(e) => setForm({ ...form, priceXmrPiconero: e.target.value })} placeholder="piconero" className="input-field text-sm" />
          )}
        </div>
        <div>
          <label className="flex items-center gap-2 text-xs font-mono text-gray-600 mb-1 cursor-pointer">
            <input type="checkbox" checked={form.acceptsPix} onChange={(e) => setForm({ ...form, acceptsPix: e.target.checked })} />
            PIX
          </label>
          {form.acceptsPix && (
            <input value={form.pricePixBrlCents} onChange={(e) => setForm({ ...form, pricePixBrlCents: e.target.value })} placeholder="centavos" className="input-field text-sm" />
          )}
        </div>
      </div>
      {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 text-xs">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          SALVAR
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline text-xs">CANCELAR</button>
      </div>
    </form>
  );
}

// ─── Add Module ───────────────────────────────────────────────────────────────

function AddModuleInline({ productId, onAdded }: { productId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await marketplaceApi.createModule(productId, { title, position: 999 });
      setTitle('');
      setOpen(false);
      onAdded();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-xs font-mono text-green-400 hover:text-green-300 border border-green-500/20 hover:border-green-500/40 px-3 py-1.5 transition-all">
        <Plus className="w-3 h-3" /> ADD_MÓDULO
      </button>
    );
  }

  return (
    <form onSubmit={save} className="flex items-center gap-2">
      <input
        autoFocus
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nome do módulo"
        className="input-field text-xs py-1.5 w-48"
      />
      <button type="submit" disabled={loading} className="text-green-400 hover:text-green-300">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-gray-600 hover:text-red-400">
        <X className="w-4 h-4" />
      </button>
    </form>
  );
}

// ─── Module block ─────────────────────────────────────────────────────────────

function ModuleBlock({ module, onChanged }: { module: Module; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(module.title);
  const [loading, setLoading] = useState(false);

  async function saveTitle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await marketplaceApi.updateModule(module.id, { title });
      setEditing(false);
      onChanged();
    } finally {
      setLoading(false);
    }
  }

  async function deleteModule() {
    if (!confirm(`Excluir módulo "${module.title}"?`)) return;
    await marketplaceApi.deleteModule(module.id);
    onChanged();
  }

  return (
    <div className="border border-green-500/20 bg-black/30">
      {/* Module header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-green-500/5">
        <GripVertical className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />
        {editing ? (
          <form onSubmit={saveTitle} className="flex items-center gap-2 flex-1">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field text-sm py-1 flex-1"
            />
            <button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-green-400" /> : <Check className="w-3.5 h-3.5 text-green-400" />}
            </button>
            <button type="button" onClick={() => setEditing(false)}><X className="w-3.5 h-3.5 text-gray-600" /></button>
          </form>
        ) : (
          <>
            <span className="font-mono text-sm font-medium text-gray-200 flex-1">{module.title}</span>
            <button onClick={() => setEditing(true)} className="text-gray-600 hover:text-green-400 transition-colors">
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button onClick={deleteModule} className="text-gray-700 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Lessons */}
      <div className="divide-y divide-green-500/5">
        {module.lessons?.map((lesson) => (
          <LessonRow key={lesson.id} lesson={lesson} onChanged={onChanged} />
        ))}
        <AddLessonRow moduleId={module.id} onAdded={onChanged} />
      </div>
    </div>
  );
}

// ─── Lesson Row ───────────────────────────────────────────────────────────────

function LessonRow({ lesson, onChanged }: { lesson: Lesson; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: lesson.title,
    type: lesson.type,
    isPreview: lesson.isPreview,
    durationSec: lesson.durationSec ? String(lesson.durationSec) : '',
    content: lesson.content ?? '',
  });
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await marketplaceApi.updateLesson(lesson.id, {
        ...form,
        durationSec: form.durationSec ? parseInt(form.durationSec) : undefined,
      });
      setEditing(false);
      onChanged();
    } finally {
      setLoading(false);
    }
  }

  async function del() {
    if (!confirm(`Excluir aula "${lesson.title}"?`)) return;
    await marketplaceApi.deleteLesson(lesson.id);
    onChanged();
  }

  function formatDur(s?: number | null) {
    if (!s) return '';
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  }

  if (editing) {
    return (
      <form onSubmit={save} className="p-4 space-y-3 bg-black/20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-mono text-gray-600 mb-1 block">TÍTULO</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field text-xs" />
          </div>
          <div>
            <label className="text-xs font-mono text-gray-600 mb-1 block">TIPO</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Lesson['type'] })} className="input-field text-xs">
              <option value="VIDEO">Vídeo</option>
              <option value="TEXT">Texto</option>
              <option value="PDF">PDF</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-mono text-gray-600 mb-1 block">DURAÇÃO (segundos)</label>
            <input type="number" value={form.durationSec} onChange={(e) => setForm({ ...form, durationSec: e.target.value })} placeholder="ex: 300" className="input-field text-xs" />
          </div>
          <div className="flex items-center gap-2 pt-5 cursor-pointer">
            <input type="checkbox" id={`prev-${lesson.id}`} checked={form.isPreview} onChange={(e) => setForm({ ...form, isPreview: e.target.checked })} />
            <label htmlFor={`prev-${lesson.id}`} className="text-xs font-mono text-gray-600 cursor-pointer">PREVIEW GRATUITO</label>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-mono text-gray-600 mb-1 block">CONTEÚDO / URL</label>
            <textarea rows={2} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="URL do vídeo ou texto..." className="input-field text-xs resize-none" />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="btn-primary text-xs py-1.5 flex items-center gap-1">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            SALVAR
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn-outline text-xs py-1.5">CANCELAR</button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 group">
      <Play className="w-3 h-3 text-gray-700 flex-shrink-0" />
      <span className="font-mono text-xs text-gray-400 flex-1">{lesson.title}</span>
      <div className="flex items-center gap-2 text-xs font-mono text-gray-700">
        {lesson.isPreview && <span className="text-green-500/60">PREVIEW</span>}
        {lesson.durationSec && <span>{formatDur(lesson.durationSec)}</span>}
        <span className="opacity-60">[{lesson.type}]</span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditing(true)} className="text-gray-600 hover:text-green-400">
          <Edit className="w-3 h-3" />
        </button>
        <button onClick={del} className="text-gray-700 hover:text-red-400">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Add Lesson Row ───────────────────────────────────────────────────────────

function AddLessonRow({ moduleId, onAdded }: { moduleId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'VIDEO' | 'TEXT' | 'PDF'>('VIDEO');
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await marketplaceApi.createLesson(moduleId, { title, type, position: 999, isPreview: false });
      setTitle('');
      setOpen(false);
      onAdded();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-5 py-2 text-xs font-mono text-gray-700 hover:text-green-400 hover:bg-green-500/5 transition-all"
      >
        <Plus className="w-3 h-3" /> ADD_AULA
      </button>
    );
  }

  return (
    <form onSubmit={save} className="flex items-center gap-2 px-5 py-2.5">
      <input
        autoFocus
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título da aula"
        className="input-field text-xs py-1 flex-1"
      />
      <select value={type} onChange={(e) => setType(e.target.value as 'VIDEO' | 'TEXT' | 'PDF')} className="input-field text-xs py-1 w-24">
        <option value="VIDEO">Vídeo</option>
        <option value="TEXT">Texto</option>
        <option value="PDF">PDF</option>
      </select>
      <button type="submit" disabled={loading} className="text-green-400 hover:text-green-300">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-gray-600 hover:text-red-400">
        <X className="w-4 h-4" />
      </button>
    </form>
  );
}
