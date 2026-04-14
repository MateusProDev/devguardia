import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const APP_ROUTES = ['/dashboard', '/scan', '/report', '/pricing'];
const ROOT_DOMAIN = 'devguardia.cloud';
const APP_DOMAIN = 'app.devguardia.cloud';

export function middleware(request: NextRequest) {
  const { hostname, pathname } = request.nextUrl;

  // In development, skip redirects
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return NextResponse.next();
  }

  // On root domain, redirect app routes to app subdomain
  if (
    (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) &&
    APP_ROUTES.some((route) => pathname.startsWith(route))
  ) {
    const url = request.nextUrl.clone();
    url.hostname = APP_DOMAIN;
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  // On app subdomain, redirect "/" to dashboard
  if (hostname === APP_DOMAIN && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url, 308);
  }

  // On app subdomain, if accessing "/" landing page, redirect to root domain
  // (already handled above by redirecting to /dashboard)

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
