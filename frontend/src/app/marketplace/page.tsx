'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, ShoppingBag, Loader2, Terminal, BookOpen, FileText, Users, Filter } from 'lucide-react';
import { marketplaceApi, Product } from '../../services/marketplace';
import { ProductCard } from '../../components/marketplace/ProductCard';

const TYPES = [
  { value: 'ALL', label: 'TODOS' },
  { value: 'COURSE', label: 'CURSOS' },
  { value: 'EBOOK', label: 'EBOOKS' },
  { value: 'MENTORSHIP', label: 'MENTORIAS' },
];

const PAGE_SIZE = 12;

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [type, setType] = useState('ALL');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (search: string, selectedType: string, currentOffset: number) => {
    setLoading(true);
    try {
      const res = await marketplaceApi.listProducts({
        q: search || undefined,
        type: selectedType !== 'ALL' ? selectedType : undefined,
        limit: PAGE_SIZE,
        offset: currentOffset,
      });
      const data: Product[] = res.items ?? res;
      if (currentOffset === 0) {
        setProducts(data);
      } else {
        setProducts((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(0);
      load(q, type, 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [q, type, load]);

  function handleLoadMore() {
    const next = offset + PAGE_SIZE;
    setOffset(next);
    load(q, type, next);
  }

  return (
    <div className="min-h-screen bg-black matrix-bg">
      {/* Navbar */}
      <nav className="border-b border-green-900/30 px-4 sm:px-6 py-4 bg-black/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 bg-green-500/20 border border-green-500/50 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-green-500" />
            </div>
            <span className="font-bold text-sm tracking-wider font-mono">
              DEV<span className="text-green-500">GUARD</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-green-400 text-xs font-mono transition-colors">
              [DASHBOARD]
            </Link>
            <Link href="/dashboard/creator" className="btn-primary py-2 px-4 text-xs">
              VENDER →
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-green-400 text-xs font-mono mb-3">
            <ShoppingBag className="w-4 h-4" />
            <span>MARKETPLACE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight mb-2">
            &lt;CURSOS_EBOOKS_MENTORIAS/&gt;
          </h1>
          <p className="text-gray-600 text-sm font-mono">
            // Pagamentos diretos ao criador via Monero (XMR) ou PIX. Sem intermediários.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="// buscar produtos..."
              className="input-field pl-10 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`px-3 py-2 text-xs font-mono border transition-all ${
                  type === t.value
                    ? 'border-green-500/60 bg-green-500/10 text-green-400'
                    : 'border-gray-800 text-gray-600 hover:border-green-500/30 hover:text-gray-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading && offset === 0 ? (
          <div className="flex justify-center py-24">
            <div className="flex items-center gap-3 text-green-500 font-mono text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>CARREGANDO<span className="animate-blink">_</span></span>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-6 h-6 text-green-500/30" />
            </div>
            <p className="font-mono text-sm text-gray-600">// Nenhum produto encontrado</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="btn-outline flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  [CARREGAR_MAIS]
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
