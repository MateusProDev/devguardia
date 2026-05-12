'use client';

import { Star } from 'lucide-react';

interface Props {
  value: number;
  max?: number;
  onChange?: (v: number) => void;
  size?: 'sm' | 'md';
}

export function StarRating({ value, max = 5, onChange, size = 'md' }: Props) {
  const sz = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          disabled={!onChange}
          className={`transition-colors ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
        >
          <Star
            className={`${sz} transition-colors ${
              star <= value
                ? 'text-yellow-500 fill-yellow-500'
                : 'text-gray-700 fill-transparent'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
