import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DevGuard AI - Segurança para Apps Web',
  description: 'Analise vulnerabilidades de segurança em seu site gerado por IA em segundos.',
  keywords: 'segurança web, vulnerabilidades, scan, OWASP, DevGuard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
