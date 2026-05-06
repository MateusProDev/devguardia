'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'invisible';
  className?: string;
}

const MAX_RETRIES = 3;

export default function Turnstile({
  onVerify,
  onExpire,
  onError,
  theme = 'dark',
  size = 'normal',
  className = '',
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const retriesRef = useRef(0);
  const mountedRef = useRef(true);
  const [hasError, setHasError] = useState(false);

  const cleanupWidget = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // Widget already removed — ignore
      }
      widgetIdRef.current = null;
    }
  }, []);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !mountedRef.current) return;

    cleanupWidget();

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '',
        callback: (token: string) => {
          retriesRef.current = 0;
          setHasError(false);
          onVerify(token);
        },
        'expired-callback': () => {
          onExpire?.();
          if (retriesRef.current < MAX_RETRIES && mountedRef.current) {
            retriesRef.current++;
            setTimeout(() => renderWidget(), 1000);
          }
        },
        'error-callback': () => {
          console.warn(`[Turnstile] Widget error (attempt ${retriesRef.current + 1}/${MAX_RETRIES})`);
          onError?.();
          if (retriesRef.current < MAX_RETRIES && mountedRef.current) {
            retriesRef.current++;
            cleanupWidget();
            setTimeout(() => renderWidget(), 2000 * retriesRef.current);
          } else {
            setHasError(true);
          }
        },
        theme,
        size,
        retry: 'auto',
        'retry-interval': 3000,
      });
    } catch (err) {
      console.warn('[Turnstile] Render failed:', err);
      setHasError(true);
    }
  }, [onVerify, onExpire, onError, theme, size, cleanupWidget]);

  useEffect(() => {
    mountedRef.current = true;
    retriesRef.current = 0;

    if (window.turnstile) {
      renderWidget();
      return;
    }

    const interval = setInterval(() => {
      if (window.turnstile) {
        clearInterval(interval);
        renderWidget();
      }
    }, 200);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      cleanupWidget();
    };
  }, [renderWidget, cleanupWidget]);

  const handleRetry = () => {
    retriesRef.current = 0;
    setHasError(false);
    renderWidget();
  };

  if (hasError) {
    return (
      <div className={`text-center ${className}`}>
        <p className="text-yellow-500 text-xs font-mono mb-2">
          [CAPTCHA] Falha ao carregar verificação
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="text-green-400 hover:text-green-300 text-xs font-mono border border-green-500/30 px-3 py-1 hover:bg-green-500/10 transition-colors"
        >
          [RETRY]
        </button>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
