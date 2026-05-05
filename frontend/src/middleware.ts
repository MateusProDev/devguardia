import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const APP_DOMAIN = 'app.devguardia.cloud';

export function middleware(request: NextRequest) {
  const { hostname, pathname, protocol } = request.nextUrl;

  // In development, skip redirects
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return NextResponse.next();
  }

  // Enforce HTTPS — redirect HTTP → HTTPS with 301
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto === 'http' || protocol === 'http:') {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = 'https';
    return NextResponse.redirect(httpsUrl, 301);
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
