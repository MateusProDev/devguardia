'use client';

import { useEffect, useRef, useCallback } from 'react';

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

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '',
      callback: onVerify,
      'expired-callback': onExpire,
      'error-callback': onError,
      theme,
      size,
    });
  }, [onVerify, onExpire, onError, theme, size]);

  useEffect(() => {
    if (window.turnstile) {
      renderWidget();
      return;
    }

    const interval = setInterval(() => {
      if (window.turnstile) {
        clearInterval(interval);
        renderWidget();
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  return <div ref={containerRef} className={className} />;
}
