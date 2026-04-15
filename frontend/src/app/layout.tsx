import type { Metadata, Viewport } from 'next';
import './globals.css';
import PageTracker from '../components/PageTracker';

const siteUrl = 'https://app.devguardia.cloud';

export const metadata: Metadata = {
  title: {
    default: 'DevGuard AI — Scanner de Vulnerabilidades com IA para Apps Web',
    template: '%s | DevGuard AI',
  },
  description:
    'Detecte vulnerabilidades críticas, headers ausentes, portas expostas e falhas de segurança em seu site ou API. Análise automatizada com inteligência artificial em menos de 30 segundos.',
  keywords: [
    'scanner de vulnerabilidades',
    'segurança web',
    'análise de segurança',
    'OWASP Top 10',
    'pentest automatizado',
    'headers de segurança',
    'SSL TLS',
    'XSS',
    'SQL Injection',
    'DevGuard AI',
    'scan de segurança',
    'vulnerabilidades web',
    'segurança de aplicações',
    'segurança de API',
    'teste de invasão',
  ],
  authors: [{ name: 'DevGuard AI' }],
  creator: 'DevGuard AI',
  publisher: 'DevGuard AI',
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: siteUrl,
    siteName: 'DevGuard AI',
    title: 'DevGuard AI — Scanner de Vulnerabilidades com IA',
    description:
      'Detecte vulnerabilidades críticas em seu app web em menos de 30 segundos. Headers, portas, SSL, OWASP e mais — com correções geradas por IA.',
    images: [
      {
        url: '/hero.png',
        width: 1200,
        height: 630,
        alt: 'DevGuard AI - Scanner de Vulnerabilidades',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DevGuard AI — Scanner de Vulnerabilidades com IA',
    description:
      'Detecte vulnerabilidades críticas em seu app web em menos de 30 segundos. Análise automatizada com IA.',
    images: ['/hero.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/android-icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon-57x57.png', sizes: '57x57' },
      { url: '/apple-icon-60x60.png', sizes: '60x60' },
      { url: '/apple-icon-72x72.png', sizes: '72x72' },
      { url: '/apple-icon-76x76.png', sizes: '76x76' },
      { url: '/apple-icon-114x114.png', sizes: '114x114' },
      { url: '/apple-icon-120x120.png', sizes: '120x120' },
      { url: '/apple-icon-144x144.png', sizes: '144x144' },
      { url: '/apple-icon-152x152.png', sizes: '152x152' },
      { url: '/apple-icon-180x180.png', sizes: '180x180' },
    ],
    other: [
      { rel: 'mask-icon', url: '/apple-icon.png' },
    ],
  },
  manifest: '/manifest.json',
  other: {
    'msapplication-TileColor': '#030712',
    'msapplication-TileImage': '/ms-icon-144x144.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#030712',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <PageTracker />
        {children}
      </body>
    </html>
  );
}
