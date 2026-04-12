import Link from 'next/link';
import { Shield, CheckCircle2 } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-500" />
            <span className="font-bold text-lg">DevGuard AI</span>
          </Link>
          <Link href="/" className="text-gray-400 hover:text-white text-sm">
            ← Início
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Preços simples e transparentes</h1>
          <p className="text-gray-400 text-lg">Comece grátis. Pague apenas quando precisar de mais.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`card flex flex-col ${p.highlight ? 'border-blue-600 ring-1 ring-blue-600 relative' : ''}`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                  Mais popular
                </div>
              )}
              <div className="mb-6">
                <h2 className="font-bold text-xl mb-2">{p.name}</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{p.price}</span>
                  {p.period && <span className="text-gray-400">{p.period}</span>}
                </div>
                <p className="text-gray-400 text-sm mt-2">{p.description}</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/"
                className={`text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                  p.highlight
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white'
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Perguntas frequentes</h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="card">
                <h3 className="font-semibold mb-2">{f.q}</h3>
                <p className="text-gray-400 text-sm">{f.a}</p>
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
    price: 'R$19,90',
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
