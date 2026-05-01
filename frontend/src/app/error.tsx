'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full border border-red-500/30 bg-black p-8 text-center">
        <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-7 h-7 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-sm font-mono font-bold text-red-400 mb-2">
          [SYSTEM_ERROR]
        </h2>
        <p className="text-gray-600 text-xs font-mono mb-6">
          // Ocorreu um erro inesperado. Tente novamente.
        </p>
        <button
          onClick={reset}
          className="btn-primary"
        >
          [RETRY]
        </button>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="text-gray-600 text-xs cursor-pointer hover:text-green-400 font-mono">
              // debug_info
            </summary>
            <pre className="mt-2 text-xs text-red-400/80 border border-red-500/20 bg-black p-3 overflow-auto font-mono">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
