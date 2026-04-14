import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const APP_DOMAIN = 'app.devguardia.cloud';

export function middleware(request: NextRequest) {
  const { hostname, pathname } = request.nextUrl;

  // In development, skip redirects
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return NextResponse.next();
  }

  // On app subdomain, redirect "/" to dashboard
  if (hostname === APP_DOMAIN && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
