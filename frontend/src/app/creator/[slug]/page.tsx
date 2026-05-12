'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Terminal, ChevronLeft, Loader2, AlertCircle, User } from 'lucide-react';
import { marketplaceApi, Creator, Product } from '../../../services/marketplace';
import { ProductCard } from '../../../components/marketplace/ProductCard';

export default function CreatorProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await marketplaceApi.getCreator(slug);
        setCreator(data.creator ?? data);
        setProducts(data.products ?? []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

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

  if (error || !creator) {
    return (
      <div className="min-h-screen bg-black matrix-bg flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="font-mono text-sm text-red-400">{error || 'Criador não encontrado'}</p>
          <Link href="/marketplace" className="btn-outline mt-4 inline-block">← [VOLTAR]</Link>
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
            href="/marketplace"
            className="flex items-center gap-2 text-gray-600 hover:text-green-400 font-mono text-xs transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            [MARKETPLACE]
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Creator header */}
        <div className="card mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {creator.avatarUrl ? (
              <img
                src={creator.avatarUrl}
                alt={creator.displayName}
                className="w-20 h-20 rounded-none border border-green-500/30 object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                <User className="w-10 h-10 text-green-500/30" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-green-500/50 font-mono text-sm">@</span>
                <span className="font-mono text-sm text-gray-500">{creator.slug}</span>
              </div>
              <h1 className="font-bold font-mono text-xl text-gray-100 mb-2">
                {creator.displayName}
              </h1>
              {creator.bio && (
                <p className="text-gray-500 text-sm font-mono leading-relaxed">{creator.bio}</p>
              )}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {creator.acceptsXmr && (
                  <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 border border-orange-500/20">
                    ɱ MONERO
                  </span>
                )}
                {creator.acceptsPix && (
                  <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 border border-blue-500/20">
                    PIX
                  </span>
                )}
                <span className="text-xs font-mono text-gray-700">
                  {products.length} produto{products.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Products */}
        <div>
          <p className="text-xs font-mono text-green-500/40 mb-4">// PRODUTOS_DO_CRIADOR</p>
          {products.length === 0 ? (
            <div className="text-center py-16 border border-green-500/10">
              <p className="font-mono text-sm text-gray-700">// Nenhum produto publicado ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
