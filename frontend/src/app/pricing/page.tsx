import Link from 'next/link';
import { Terminal, CheckCircle2 } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black">
      <nav className="border-b border-green-500/20 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-green-500" />
            <span className="font-bold text-sm font-mono text-green-400">DevGuard_IA</span>
          </Link>
          <Link href="/" className="text-gray-600 hover:text-green-400 text-xs font-mono">
            &lt;- home
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-20">
        <div className="text-center mb-10 sm:mb-16">
          <h1 className="text-xl sm:text-2xl font-bold mb-4 font-mono text-green-400">[PRICING]</h1>
          <p className="text-gray-600 text-xs sm:text-sm font-mono">// Comece grátis. Pague apenas quando precisar de mais.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`card flex flex-col ${p.highlight ? 'border-green-500/50 ring-1 ring-green-500/20 relative' : ''}`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black text-[10px] font-bold px-3 py-0.5 font-mono uppercase tracking-wider">
                  [RECOMMENDED]
                </div>
              )}
              <div className="mb-6">
                <h2 className="font-bold text-sm mb-2 font-mono text-green-400">{p.name}</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-white">{p.price}</span>
                  {p.period && <span className="text-gray-600 text-xs font-mono">{p.period}</span>}
                </div>
                <p className="text-gray-600 text-xs mt-2 font-mono">// {p.description}</p>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs font-mono">
                    <span className="text-green-500 flex-shrink-0">[+]</span>
                    <span className="text-gray-500">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/"
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

        <div className="mt-16 max-w-2xl mx-auto">
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

const plans = [
  {
    name: 'Grátis',
    price: 'R$0',
    period: '',
    description: 'Para testar e experimentar',
    highlight: false,
    cta: 'Começar grátis',
    features: [
      '1 scan por dia',
      'Score de segurança (0-100)',
      '2 vulnerabilidades visíveis',
      'Categorização por severidade',
    ],
  },
  {
    name: 'Scan Avulso',
    price: 'R$9,90',
    period: '/scan',
    description: 'Para análises pontuais',
    highlight: false,
    cta: 'Comprar scan',
    features: [
      'Relatório completo',
      'Todas as vulnerabilidades',
      'Soluções detalhadas',
      'Explicações com IA',
      'Código de correção (quando disponível)',
    ],
  },
  {
    name: 'Assinatura',
    price: 'R$39,90',
    period: '/mês',
    description: 'Para projetos em andamento',
    highlight: true,
    cta: 'Assinar agora',
    features: [
      'Scans ilimitados',
      'Todos os recursos do Scan Avulso',
      'Histórico completo',
      'Novos checks de segurança automaticamente',
      'Suporte prioritário',
    ],
  },
];

const faqs = [
  {
    q: 'O scan gratuito é realmente gratuito?',
    a: 'Sim! Você pode fazer 1 scan por dia gratuitamente e ver o score e 2 vulnerabilidades. Não é necessário cartão de crédito.',
  },
  {
    q: 'Que tipo de vulnerabilidades são detectadas?',
    a: 'Verificamos headers HTTP (HSTS, CSP, CORS, X-Frame-Options e outros), configuração de cookies, portas abertas via Nmap, exposição de informações do servidor e muito mais.',
  },
  {
    q: 'O scan pode prejudicar meu site?',
    a: 'Não. Nosso scan é passivo e não-intrusivo. Apenas lemos os headers HTTP e verificamos portas comuns com Nmap em modo seguro.',
  },
  {
    q: 'Como funciona o pagamento?',
    a: 'Utilizamos Mercado Pago. O acesso ao relatório completo é liberado automaticamente após a confirmação do pagamento (geralmente imediato).',
  },
];
