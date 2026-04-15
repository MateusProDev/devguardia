'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '../services/api';
import { auth } from '../lib/firebase';

function getSessionId() {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem('dg_sid');
  if (!sid) {
    sid = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem('dg_sid', sid);
  }
  return sid;
}

export default function PageTracker() {
  const pathname = usePathname();
  const lastPath = useRef('');

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;

    // Small delay to not block page render
    const timer = setTimeout(() => {
      api.trackPageView({
        path: pathname,
        sessionId: getSessionId(),
        referrer: document.referrer || undefined,
        userId: auth?.currentUser?.uid || undefined,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
