import Link from 'next/link';
import { Terminal, Shield, Zap, Building2, Scan, Mail } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black">
      <nav className="border-b border-green-500/20 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-green-500" />
            <span className="font-bold text-sm font-mono text-green-400">DevGuard_IA</span>
          </Link>
          <Link href="/" className="text-gray-600 hover:text-green-400 text-xs font-mono">
            &lt;- home
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-20">
        <div className="text-center mb-10 sm:mb-16">
          <h1 className="text-xl sm:text-2xl font-bold mb-4 font-mono text-green-400">[PRICING]</h1>
          <p className="text-gray-600 text-xs sm:text-sm font-mono">// Escolha o plano ideal para sua necessidade de segurança.</p>
        </div>

        {/* === ONE-OFF SCANS === */}
        <div className="mb-12">
          <h2 className="text-sm font-bold mb-6 font-mono text-green-400 text-center">[SCANS_AVULSOS]</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {oneOffPlans.map((p) => (
              <div key={p.name} className="card flex flex-col">
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Scan className="w-4 h-4 text-green-500" />
                    <h3 className="font-bold text-sm font-mono text-green-400">{p.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-white">{p.price}</span>
                    <span className="text-gray-600 text-xs font-mono">/scan</span>
                  </div>
                  <p className="text-gray-600 text-xs mt-2 font-mono">// {p.description}</p>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs font-mono">
                      <span className="text-green-500 flex-shrink-0">[+]</span>
                      <span className="text-gray-500">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/" className="text-center py-2.5 text-xs font-mono uppercase tracking-wider border border-green-500/20 hover:border-green-500/50 text-gray-600 hover:text-green-400 transition-all">
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* === SUBSCRIPTION PLANS === */}
        <div className="mb-12">
          <h2 className="text-sm font-bold mb-6 font-mono text-green-400 text-center">[PLANOS_MENSAIS]</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {subscriptionPlans.map((p) => (
              <div
                key={p.name}
                className={`card flex flex-col ${p.highlight ? 'border-green-500/50 ring-1 ring-green-500/20 relative' : ''}`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black text-[10px] font-bold px-3 py-0.5 font-mono uppercase tracking-wider">
                    [POPULAR]
                  </div>
                )}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    {p.icon}
                    <h3 className="font-bold text-sm font-mono text-green-400">{p.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-white">{p.price}</span>
                    {p.period && <span className="text-gray-600 text-xs font-mono">{p.period}</span>}
                  </div>
                  <p className="text-gray-600 text-xs mt-2 font-mono">// {p.description}</p>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs font-mono">
                      <span className="text-green-500 flex-shrink-0">[+]</span>
                      <span className="text-gray-500">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.href}
                  className={`text-center py-3 text-xs font-mono uppercase tracking-wider transition-all ${
                    p.highlight
                      ? 'bg-green-600/20 text-green-400 border border-green-500/50 hover:bg-green-600/30'
                      : 'border border-green-500/20 hover:border-green-500/50 text-gray-600 hover:text-green-400'
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* === ENTERPRISE / BUSINESS === */}
        <div className="mb-16">
          <div className="card max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-green-500" />
                  <h3 className="font-bold text-sm font-mono text-green-400">[ENTERPRISE]</h3>
                </div>
                <p className="text-gray-500 text-xs font-mono mb-3">
                  // Soluções sob medida para equipes e infraestruturas complexas.
                </p>
                <ul className="space-y-1.5">
                  {enterpriseFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs font-mono">
                      <span className="text-green-500 flex-shrink-0">[+]</span>
                      <span className="text-gray-500">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col items-center gap-2 sm:min-w-[160px]">
                <span className="text-lg font-bold font-mono text-white">Personalizado</span>
                <a
                  href="mailto:contato@devguard.com.br?subject=Plano%20Enterprise"
                  className="text-center py-3 px-6 text-xs font-mono uppercase tracking-wider border border-green-500/50 text-green-400 hover:bg-green-600/20 transition-all flex items-center gap-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Falar com vendas
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* === COMPARISON TABLE === */}
        <div className="mb-16 max-w-4xl mx-auto overflow-x-auto">
          <h2 className="text-sm font-bold mb-6 font-mono text-green-400 text-center">[COMPARATIVO]</h2>
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-green-500/20">
                <th className="text-left py-3 px-3 text-gray-500">Recurso</th>
                <th className="text-center py-3 px-3 text-gray-400">Grátis</th>
                <th className="text-center py-3 px-3 text-gray-400">Starter</th>
                <th className="text-center py-3 px-3 text-green-400">Pro</th>
                <th className="text-center py-3 px-3 text-gray-400">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature} className="border-b border-green-500/10">
                  <td className="py-2.5 px-3 text-gray-500">{row.feature}</td>
                  <td className="py-2.5 px-3 text-center text-gray-600">{row.free}</td>
                  <td className="py-2.5 px-3 text-center text-gray-400">{row.starter}</td>
                  <td className="py-2.5 px-3 text-center text-green-400">{row.pro}</td>
                  <td className="py-2.5 px-3 text-center text-gray-400">{row.enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* === FAQ === */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-sm font-bold text-center mb-8 font-mono text-green-400">[FAQ]</h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="card">
                <h3 className="font-semibold mb-2 text-xs font-mono text-gray-300">{f.q}</h3>
                <p className="text-gray-600 text-xs font-mono">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const oneOffPlans = [
  {
    name: 'Scan Básico',
    price: 'R$9,90',
    description: 'Análise pontual com Nmap + HTTP headers',
    cta: 'Comprar scan',
    features: [
      'Relatório completo de 1 URL',
      'Portas críticas (10 portas)',
      'Headers HTTP + cookies',
      'Explicações com IA',
      'Código de correção',
    ],
  },
  {
    name: 'Scan Avulso Pro',
    price: 'R$24,90',
    description: 'Análise profunda com varredura agressiva',
    cta: 'Comprar scan pro',
    features: [
      'Tudo do Scan Básico',
      'Varredura de 1024+ portas',
      'Detecção de serviços (-sV)',
      'Relatório detalhado avançado',
      'Suporte prioritário',
    ],
  },
];

const subscriptionPlans = [
  {
    name: 'Grátis',
    price: 'R$0',
    period: '',
    description: 'Para testar e experimentar',
    highlight: false,
    cta: 'Começar grátis',
    href: '/',
    icon: <Shield className="w-4 h-4 text-gray-600" />,
    features: [
      '1 scan por dia (5/mês)',
      'Score de segurança (0-100)',
      '2 vulnerabilidades visíveis',
      'Portas básicas (6 portas)',
      'Histórico de 7 dias',
    ],
  },
  {
    name: 'Starter',
    price: 'R$39,90',
    period: '/mês',
    description: 'Nmap + HTTP — para devs independentes',
    highlight: false,
    cta: 'Assinar Starter',
    href: '/',
    icon: <Shield className="w-4 h-4 text-green-500" />,
    features: [
      '5 scans/dia (50/mês)',
      'Todas as vulnerabilidades',
      'Nmap: 10 portas críticas',
      'Explicações com IA',
      'Histórico de 30 dias',
      '2 scans simultâneos',
    ],
  },
  {
    name: 'Pro',
    price: 'R$99,90',
    period: '/mês',
    description: 'Scans agressivos para equipes e agências',
    highlight: true,
    cta: 'Assinar Pro',
    href: '/',
    icon: <Zap className="w-4 h-4 text-green-400" />,
    features: [
      '30 scans/dia (300/mês)',
      'Varredura agressiva (1024+ portas)',
      'Detecção de serviços (-sV)',
      'Fila prioritária',
      'Histórico de 90 dias',
      '5 scans simultâneos',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Sob medida para grandes operações',
    highlight: false,
    cta: 'Falar com vendas',
    href: 'mailto:contato@devguard.com.br?subject=Plano%20Enterprise',
    icon: <Building2 className="w-4 h-4 text-green-500" />,
    features: [
      '100 scans/dia (1000/mês)',
      'Varredura completa (65535 portas)',
      'Fila prioritária dedicada',
      'Suporte premium 24/7',
      'Histórico de 365 dias',
      '10 scans simultâneos',
    ],
  },
];

const enterpriseFeatures = [
  'Varredura completa de todas as 65.535 portas TCP',
  'Até 100 scans por dia / 1.000 por mês',
  '10 scans simultâneos com fila dedicada',
  'Histórico de 365 dias com exportação de relatórios',
  'Suporte premium com SLA garantido',
  'Integração via API e webhooks',
  'Onboarding personalizado para sua equipe',
];

const comparisonRows = [
  { feature: 'Scans/dia', free: '1', starter: '5', pro: '30', enterprise: '100' },
  { feature: 'Scans/mês', free: '5', starter: '50', pro: '300', enterprise: '1.000' },
  { feature: 'Portas Nmap', free: '6', starter: '10', pro: '1.024+', enterprise: '65.535' },
  { feature: 'Detecção de serviços', free: '—', starter: '—', pro: '✓', enterprise: '✓' },
  { feature: 'Explicações IA', free: '—', starter: '✓', pro: '✓', enterprise: '✓' },
  { feature: 'Scans simultâneos', free: '1', starter: '2', pro: '5', enterprise: '10' },
  { feature: 'Fila prioritária', free: '—', starter: '—', pro: '✓', enterprise: '✓' },
  { feature: 'Histórico', free: '7 dias', starter: '30 dias', pro: '90 dias', enterprise: '365 dias' },
  { feature: 'Suporte', free: 'Chat', starter: 'Chat', pro: 'Prioritário', enterprise: 'Premium 24/7' },
];

const faqs = [
  {
    q: 'O scan gratuito é realmente gratuito?',
    a: 'Sim! Você pode fazer 1 scan por dia gratuitamente e ver o score e 2 vulnerabilidades. Não é necessário cartão de crédito.',
  },
  {
    q: 'Qual a diferença entre Starter e Pro?',
    a: 'O Starter faz varredura básica (Nmap em 10 portas críticas + headers HTTP). O Pro faz varredura agressiva com detecção de serviços em 1.024+ portas, ideal para equipes que precisam de análises profundas.',
  },
  {
    q: 'O que é o Scan Avulso?',
    a: 'É uma compra única sem assinatura. Ideal para quem precisa de um relatório pontual. O Scan Básico cobre portas críticas, e o Scan Avulso Pro faz varredura completa.',
  },
  {
    q: 'Posso fazer upgrade de plano?',
    a: 'Sim! Ao fazer upgrade, seu novo plano é ativado imediatamente e o período é estendido por mais 30 dias.',
  },
  {
    q: 'O scan pode prejudicar meu site?',
    a: 'Não. Nosso scan é passivo e não-intrusivo. Apenas lemos os headers HTTP e verificamos portas com Nmap em modo seguro (--unprivileged).',
  },
  {
    q: 'Como funciona o pagamento?',
    a: 'Utilizamos Mercado Pago (cartão ou PIX). O acesso é liberado automaticamente após a confirmação do pagamento.',
  },
];
