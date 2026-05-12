'use client';

import Link from 'next/link';
import { BookOpen, FileText, Users, Star } from 'lucide-react';
import { Product, piconeroToXmr, centsToBrl } from '../../services/marketplace';

const TYPE_LABELS: Record<string, string> = {
  COURSE: 'CURSO',
  EBOOK: 'EBOOK',
  MENTORSHIP: 'MENTORIA',
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  COURSE: BookOpen,
  EBOOK: FileText,
  MENTORSHIP: Users,
};

interface Props {
  product: Product;
}

export function ProductCard({ product }: Props) {
  const Icon = TYPE_ICONS[product.type] ?? BookOpen;
  const label = TYPE_LABELS[product.type] ?? product.type;

  return (
    <Link
      href={`/marketplace/${product.slug}`}
      className="group block bg-black border border-green-500/20 hover:border-green-500/50 transition-all duration-200"
    >
      {product.coverImageUrl ? (
        <div className="aspect-video overflow-hidden border-b border-green-500/10">
          <img
            src={product.coverImageUrl}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-video bg-green-500/5 border-b border-green-500/10 flex items-center justify-center">
          <Icon className="w-12 h-12 text-green-500/20" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-green-500/60 bg-green-500/10 px-2 py-0.5 border border-green-500/20">
            [{label}]
          </span>
          {product.avgRating !== undefined && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-xs font-mono text-yellow-500">{product.avgRating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <h3 className="font-mono font-semibold text-sm text-gray-200 group-hover:text-green-400 transition-colors line-clamp-2 mb-2">
          {product.title}
        </h3>

        {product.shortDescription && (
          <p className="text-gray-600 text-xs font-mono line-clamp-2 mb-3">
            {product.shortDescription}
          </p>
        )}

        {product.creator && (
          <p className="text-gray-700 text-xs font-mono mb-3">
            <span className="text-green-500/50">@</span>
            {product.creator.displayName}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {product.acceptsXmr && product.priceXmrPiconero && (
            <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-1 border border-orange-500/20">
              ɱ {piconeroToXmr(product.priceXmrPiconero)} XMR
            </span>
          )}
          {product.acceptsPix && product.pricePixBrlCents && (
            <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-1 border border-blue-500/20">
              PIX {centsToBrl(product.pricePixBrlCents)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
