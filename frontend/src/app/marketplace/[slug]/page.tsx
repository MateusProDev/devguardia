'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Terminal, ChevronLeft, BookOpen, FileText, Users, Clock, Play,
  Lock, Star, ShoppingBag, Loader2, ChevronDown, ChevronRight, AlertCircle,
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { marketplaceApi, Product, Review, piconeroToXmr, centsToBrl } from '../../../services/marketplace';
import { CheckoutModal } from '../../../components/marketplace/CheckoutModal';
import { StarRating } from '../../../components/marketplace/StarRating';

const TYPE_LABELS: Record<string, string> = { COURSE: 'CURSO', EBOOK: 'EBOOK', MENTORSHIP: 'MENTORIA' };

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    async function fetchAll() {
      try {
        const p = await marketplaceApi.getProduct(slug);
        setProduct(p);
        if (p.modules?.length) {
          setOpenModules({ [p.modules[0].id]: true });
        }
        const r = await marketplaceApi.getReviews(p.id);
        setReviews(r.items ?? r.reviews ?? r);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [slug]);

  useEffect(() => {
    if (!user || !product) return;
    marketplaceApi.checkAccess(product.id).then((r) => setHasAccess(r.hasAccess)).catch(() => {});
  }, [user, product]);

  function toggleModule(id: string) {
    setOpenModules((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!myRating || !product) return;
    setReviewLoading(true);
    setReviewError('');
    try {
      await marketplaceApi.upsertReview(product.id, { rating: myRating, comment: myComment });
      const r = await marketplaceApi.getReviews(product.id);
      setReviews(r.items ?? r.reviews ?? r);
    } catch (e: any) {
      setReviewError(e.message);
    } finally {
      setReviewLoading(false);
    }
  }

  function formatDuration(secs?: number | null) {
    if (!secs) return null;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black matrix-bg flex items-center justify-center">
        <div className="flex items-center gap-3 text-green-500 font-mono text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>CARREGANDO<span className="animate-blink">_</span></span>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-black matrix-bg flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="font-mono text-sm text-red-400">{error || 'Produto não encontrado'}</p>
          <Link href="/marketplace" className="btn-outline mt-4 inline-block">← [VOLTAR]</Link>
        </div>
      </div>
    );
  }

  const avgRating = reviews.length
    ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="min-h-screen bg-black matrix-bg">
      {/* Navbar */}
      <nav className="border-b border-green-900/30 px-4 sm:px-6 py-4 bg-black/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <Link href="/marketplace" className="flex items-center gap-2 text-gray-600 hover:text-green-400 font-mono text-xs transition-colors">
            <ChevronLeft className="w-4 h-4" />
            [MARKETPLACE]
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500/20 border border-green-500/50 flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5 text-green-500" />
            </div>
            <span className="font-bold text-xs tracking-wider font-mono">DEV<span className="text-green-500">GUARD</span></span>
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cover */}
            {product.coverImageUrl ? (
              <div className="aspect-video overflow-hidden border border-green-500/20">
                <img src={product.coverImageUrl} alt={product.title} className="w-full h-full object-cover" />
              </div>
            ) : null}

            {/* Title block */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-green-500/60 bg-green-500/10 px-2 py-0.5 border border-green-500/20">
                  [{TYPE_LABELS[product.type] ?? product.type}]
                </span>
                {avgRating > 0 && (
                  <div className="flex items-center gap-1">
                    <StarRating value={Math.round(avgRating)} size="sm" />
                    <span className="text-xs font-mono text-yellow-500">({reviews.length})</span>
                  </div>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight mb-2">{product.title}</h1>
              {product.shortDescription && (
                <p className="text-gray-500 text-sm font-mono">{product.shortDescription}</p>
              )}
              {product.creator && (
                <Link
                  href={`/creator/${product.creator.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-mono text-green-500/60 hover:text-green-400 mt-2 transition-colors"
                >
                  <span className="text-green-500/40">@</span>
                  {product.creator.displayName}
                </Link>
              )}
            </div>

            {/* Description */}
            <div className="card">
              <p className="text-xs font-mono text-green-500/40 mb-3">// DESCRIÇÃO</p>
              <div className="text-gray-400 text-sm font-mono whitespace-pre-wrap leading-relaxed">
                {product.description}
              </div>
            </div>

            {/* Modules / Curriculum */}
            {product.modules && product.modules.length > 0 && (
              <div className="card">
                <p className="text-xs font-mono text-green-500/40 mb-4">// CONTEÚDO</p>
                <div className="space-y-2">
                  {product.modules.map((mod) => (
                    <div key={mod.id} className="border border-green-500/10">
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-green-500/5 transition-colors"
                      >
                        <span className="font-mono text-sm font-medium text-gray-300">{mod.title}</span>
                        <div className="flex items-center gap-2 text-xs font-mono text-gray-600">
                          <span>{mod.lessons?.length ?? 0} aulas</span>
                          {openModules[mod.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </div>
                      </button>
                      {openModules[mod.id] && mod.lessons && (
                        <div className="border-t border-green-500/10">
                          {mod.lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="flex items-center gap-3 px-5 py-2.5 border-b border-green-500/5 last:border-0"
                            >
                              {lesson.isPreview ? (
                                <Play className="w-3 h-3 text-green-500 flex-shrink-0" />
                              ) : hasAccess ? (
                                <Play className="w-3 h-3 text-green-400 flex-shrink-0" />
                              ) : (
                                <Lock className="w-3 h-3 text-gray-700 flex-shrink-0" />
                              )}
                              <span className={`font-mono text-xs flex-1 ${!lesson.isPreview && !hasAccess ? 'text-gray-700' : 'text-gray-400'}`}>
                                {lesson.title}
                              </span>
                              {lesson.durationSec && (
                                <span className="text-xs font-mono text-gray-700">
                                  {formatDuration(lesson.durationSec)}
                                </span>
                              )}
                              {lesson.isPreview && (
                                <span className="text-xs font-mono text-green-500/60 bg-green-500/10 px-1.5 py-0.5">
                                  PREVIEW
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="card">
              <p className="text-xs font-mono text-green-500/40 mb-4">// AVALIAÇÕES ({reviews.length})</p>

              {user && hasAccess && (
                <form onSubmit={handleReviewSubmit} className="mb-6 border border-green-500/10 p-4 space-y-3">
                  <p className="text-xs font-mono text-gray-600">Sua avaliação:</p>
                  <StarRating value={myRating} onChange={setMyRating} />
                  <textarea
                    value={myComment}
                    onChange={(e) => setMyComment(e.target.value)}
                    placeholder="// comentário opcional..."
                    rows={3}
                    className="input-field text-xs resize-none"
                  />
                  {reviewError && <p className="text-red-400 text-xs font-mono">{reviewError}</p>}
                  <button type="submit" disabled={!myRating || reviewLoading} className="btn-primary text-xs py-2">
                    {reviewLoading ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                    ENVIAR_AVALIAÇÃO
                  </button>
                </form>
              )}

              {reviews.length === 0 ? (
                <p className="text-gray-700 text-xs font-mono">// Ainda sem avaliações.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="border-b border-green-500/10 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StarRating value={r.rating} size="sm" />
                        <span className="text-xs font-mono text-gray-700">
                          {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {r.comment && <p className="text-sm font-mono text-gray-500 mt-1">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: buy card */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 card space-y-4">
              <p className="text-xs font-mono text-green-500/40">// ADQUIRIR</p>

              <div className="space-y-2">
                {product.acceptsXmr && product.priceXmrPiconero && (
                  <div className="border border-orange-500/20 p-3 bg-orange-500/5">
                    <p className="text-xs font-mono text-orange-500/60">MONERO</p>
                    <p className="font-mono text-lg font-bold text-orange-400">
                      ɱ {piconeroToXmr(product.priceXmrPiconero)} XMR
                    </p>
                  </div>
                )}
                {product.acceptsPix && product.pricePixBrlCents && (
                  <div className="border border-blue-500/20 p-3 bg-blue-500/5">
                    <p className="text-xs font-mono text-blue-500/60">PIX</p>
                    <p className="font-mono text-lg font-bold text-blue-400">
                      {centsToBrl(product.pricePixBrlCents)}
                    </p>
                  </div>
                )}
              </div>

              {hasAccess ? (
                <div className="text-center py-3 border border-green-500/30 bg-green-500/10">
                  <p className="font-mono text-sm text-green-400">✓ ACESSO_LIBERADO</p>
                </div>
              ) : user ? (
                <button
                  onClick={() => setShowCheckout(true)}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  COMPRAR_AGORA
                </button>
              ) : (
                <Link href="/dashboard" className="btn-primary w-full flex items-center justify-center gap-2">
                  LOGIN_PARA_COMPRAR →
                </Link>
              )}

              <div className="border-t border-green-500/10 pt-3 space-y-1">
                <p className="text-xs font-mono text-gray-700">// Pagamento direto ao vendedor</p>
                <p className="text-xs font-mono text-gray-700">// Sem intermediários</p>
                <p className="text-xs font-mono text-gray-700">// Confirmação manual pelo vendedor</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal
          product={product}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </div>
  );
}
