
"use client";
const APP_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? 'https://app.devguardia.cloud'
  : '';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Shield,
  Zap,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Search,
  BarChart3,
  Code2,
  Eye,
  Server,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  ChevronRight,
  Star,
  Users,
  TrendingUp,
  Clock,
  Menu,
  X,
} from 'lucide-react';

/* ─── Animated counter hook ─── */
function useCounter(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const step = end / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);
  return { count, ref };
}

export default function LandingPage() {
  const [demoUrl, setDemoUrl] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function goToApp(withUrl = false) {
    if (withUrl && demoUrl) {
      window.location.href = `${APP_URL}/scan?url=${encodeURIComponent(demoUrl)}`;
    } else {
      window.location.href = `${APP_URL}/dashboard`;
    }
  }

  const stats = {
    scans: useCounter(74),
    vulns: useCounter(312),
    users: useCounter(23),
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'DevGuard IA',
            applicationCategory: 'SecurityApplication',
            operatingSystem: 'Web',
            description:
              'Scanner de vulnerabilidades com inteligência artificial para aplicações web. Detecte falhas de segurança em segundos.',
            url: 'https://app.devguardia.cloud',
            offers: [
              {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'BRL',
                name: 'Gratuito',
                description: '1 scan por dia com score de segurança',
              },
              {
                '@type': 'Offer',
                price: '9.90',
                priceCurrency: 'BRL',
                name: 'Scan Completo',
                description: 'Relatório completo com todas as vulnerabilidades e correções com IA',
              },
              {
                '@type': 'Offer',
                price: '39.90',
                priceCurrency: 'BRL',
                name: 'Assinatura Pro',
                description: 'Scans ilimitados com relatórios completos e prioridade na fila',
              },
            ],
          }),
        }}
      />

      {/* ═══════ NAVBAR ═══════ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50 shadow-2xl shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/favicon-96x96.png" alt="DevGuard IA" width={32} height={32} className="rounded-md" />
            <span className="font-bold text-xl tracking-tight">
              Dev<span className="text-blue-500">Guard</span> IA
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-400 hover:text-white text-sm transition-colors">
              Recursos
            </a>
            <a href="#how-it-works" className="text-gray-400 hover:text-white text-sm transition-colors">
              Como funciona
            </a>
            <a href="#pricing" className="text-gray-400 hover:text-white text-sm transition-colors">
              Preços
            </a>
            <a href="/pricing" className="text-gray-400 hover:text-white text-sm transition-colors">
              Planos
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => goToApp()} className="btn-outline text-sm py-2 px-4">
              Login
            </button>
            <button onClick={() => goToApp()} className="btn-primary text-sm py-2 px-5">
              Começar grátis
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden text-gray-400" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/50 px-6 py-6 space-y-4 animate-fade-in">
            <a href="#features" className="block text-gray-300 hover:text-white transition-colors" onClick={() => setMobileMenu(false)}>
              Recursos
            </a>
            <a href="#how-it-works" className="block text-gray-300 hover:text-white transition-colors" onClick={() => setMobileMenu(false)}>
              Como funciona
            </a>
            <a href="#pricing" className="block text-gray-300 hover:text-white transition-colors" onClick={() => setMobileMenu(false)}>
              Preços
            </a>
            <button onClick={() => goToApp()} className="btn-primary w-full text-sm mt-2">
              Começar grátis
            </button>
          </div>
        )}
      </nav>

      {/* ═══════ HERO SECTION ═══════ */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-32">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/8 rounded-full blur-[120px]" />
          <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-950/60 border border-blue-800/50 text-blue-300 text-sm px-5 py-2.5 rounded-full mb-8 animate-fade-in backdrop-blur-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
            Seu app pode estar vulnerável agora. 
          </div>

          {/* Main heading */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.05] mb-8 animate-slide-up">
            Hackers não avisam — 
            <br />
            <span className="relative">
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
               eles exploram.
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                <path d="M2 10C50 4 100 2 150 6C200 10 250 4 298 8" stroke="url(#underline-gradient)" strokeWidth="3" strokeLinecap="round" />
                <defs>
                  <linearGradient id="underline-gradient" x1="0" y1="0" x2="300" y2="0">
                    <stop stopColor="#60a5fa" />
                    <stop offset="1" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-12 animate-slide-up animation-delay-100 leading-relaxed">
            Quase todo app tem falhas críticas ocultas. Uma só pode causar prejuízo. Descubra antes dos hackers!
          </p>

          {/* CTA Input */}
          <div className="max-w-2xl mx-auto animate-slide-up animation-delay-200">
            <div className="relative flex flex-col sm:flex-row gap-3 p-2 bg-gray-900/80 border border-gray-800/80 rounded-2xl backdrop-blur-sm">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  placeholder="seudominio.com.br"
                  className="w-full bg-transparent text-white placeholder-gray-500 pl-12 pr-4 py-4 outline-none text-lg"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </div>
              <button
                onClick={() => goToApp(true)}
                className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap text-base px-8 py-4 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all"
              >
                Checar meu app agora
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-4 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500/70" />
              1 scan gratuito por dia — sem cartão, sem risco
            </p>
          </div>

          {/* Trusted by / Social proof */}
          <div className="mt-20 animate-fade-in animation-delay-400">
            <p className="text-gray-600 text-xs uppercase tracking-widest mb-6">
              Confiado por devs e startups
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-40">
              {['Next.js', 'Vercel', 'Railway', 'Supabase', 'Firebase', 'Cloudflare', 'Upstash'].map((name) => (
                <span key={name} className="text-gray-400 font-semibold text-lg tracking-wide">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ STATS BAR ═══════ */}
      <section className="border-y border-gray-800/50 bg-gray-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div ref={stats.scans.ref}>
            <div className="text-4xl md:text-5xl font-bold text-white mb-1">
              {stats.scans.count.toLocaleString('pt-BR')}+
            </div>
            <p className="text-gray-500 text-sm flex items-center justify-center gap-1.5">
              <Search className="w-4 h-4" /> Scans realizados
            </p>
          </div>
          <div ref={stats.vulns.ref}>
            <div className="text-4xl md:text-5xl font-bold text-white mb-1">
              {stats.vulns.count.toLocaleString('pt-BR')}+
            </div>
            <p className="text-gray-500 text-sm flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> Vulnerabilidades encontradas
            </p>
          </div>
          <div ref={stats.users.ref}>
            <div className="text-4xl md:text-5xl font-bold text-white mb-1">
              {stats.users.count.toLocaleString('pt-BR')}+
            </div>
            <p className="text-gray-500 text-sm flex items-center justify-center gap-1.5">
              <Users className="w-4 h-4" /> Desenvolvedores
            </p>
          </div>
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section id="features" className="relative max-w-7xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-blue-400 text-sm font-medium mb-4">
            <Eye className="w-4 h-4" />
            RISCO ESCONDIDO
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            O que pode estar vulnerável no seu app?
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Falhas que hackers exploram passam despercebidas por quem não é especialista. Não teste no escuro.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group relative bg-gray-900/50 border border-gray-800/50 rounded-2xl p-7 hover:border-gray-700/80 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${featureColors[i % featureColors.length]}`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2 text-white">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how-it-works" className="relative bg-gray-900/20 border-y border-gray-800/30">
        <div className="max-w-7xl mx-auto px-6 py-28">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-cyan-400 text-sm font-medium mb-4">
              <Terminal className="w-4 h-4" />
              COMO EVITAR UM DESASTRE
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              3 passos para não ser pego de surpresa
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Em menos de 30 segundos, descubra se seu app está seguro ou pronto para ser explorado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.title} className="relative text-center">
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-gray-700 to-transparent" />
                )}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-800/80 border border-gray-700/50 mb-6 relative">
                  <span className="text-blue-400">{s.icon}</span>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-gray-400 text-sm max-w-xs mx-auto">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ LIVE DEMO / SCORE PREVIEW ═══════ */}
      <section className="max-w-7xl mx-auto px-6 py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-orange-400 text-sm font-medium mb-4">
              <BarChart3 className="w-4 h-4" />
              RESULTADOS EM TEMPO REAL
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Veja o que hackers podem ver no seu app
            </h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Seu app pode expor dados, senhas e clientes sem você perceber. Cada falha encontrada vem com explicação simples e correção pronta para aplicar.
            </p>
            <ul className="space-y-4 mb-8">
              {[
                'Relatório detalhado com score de 0-100',
                'Vulnerabilidades categorizadas por severidade',
                'Correções prontas para copiar e colar',
                'Explicações simples, sem jargão técnico',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => goToApp(true)} className="btn-primary inline-flex items-center gap-2">
              Ver vulnerabilidades agora <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Scan result card */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-cyan-600/10 rounded-3xl blur-2xl" />
            <div className="relative bg-gray-900 border border-gray-800/80 rounded-2xl p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <p className="text-gray-400 text-sm">exemplo-startup.vercel.app</p>
                  </div>
                  <h3 className="text-xl font-bold">Resultado do Scan</h3>
                </div>
                <div className="text-center bg-red-950/50 border border-red-800/50 rounded-xl px-5 py-3">
                  <div className="text-4xl font-bold text-red-400">42</div>
                  <div className="text-red-400/70 text-xs font-medium">CRÍTICO</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-800 rounded-full mb-6 overflow-hidden">
                <div className="h-full w-[42%] bg-gradient-to-r from-red-500 to-red-400 rounded-full" />
              </div>

              {/* Vulnerabilities */}
              <div className="space-y-2.5">
                {exampleVulns.map((v) => (
                  <div
                    key={v.title}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border ${severityStyle[v.severity]} transition-all hover:scale-[1.01]`}
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{v.title}</p>
                      <p className="text-xs opacity-60 mt-0.5">{v.severity}</p>
                    </div>
                    {v.locked && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded-md">
                        <Lock className="w-3 h-3" />
                        PRO
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Upsell */}
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-950/60 to-purple-950/40 border border-blue-800/40 rounded-xl text-center">
                <p className="text-blue-300 text-sm mb-3">
                  +3 vulnerabilidades ocultas — desbloqueie o relatório completo
                </p>
                <button onClick={() => goToApp()} className="btn-primary text-sm py-2.5 px-6">
                  Ver relatório completo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section className="bg-gray-900/20 border-y border-gray-800/30">
        <div className="max-w-7xl mx-auto px-6 py-28">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-yellow-400 text-sm font-medium mb-4">
              <Star className="w-4 h-4" />
              DEPOIMENTOS
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              O que devs estão dizendo
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-6 hover:border-gray-700/60 transition-colors">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ PRICING ═══════ */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-green-400 text-sm font-medium mb-4">
            <TrendingUp className="w-4 h-4" />
            QUANTO VALE SUA SEGURANÇA?
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Preço menor que um prejuízo
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Teste grátis. Só pague se quiser ver todos os riscos e correções.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative bg-gray-900/50 border rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 ${
                p.highlight
                  ? 'border-blue-500/50 ring-1 ring-blue-500/20 shadow-xl shadow-blue-600/5'
                  : 'border-gray-800/50 hover:border-gray-700/80'
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                  MAIS POPULAR
                </div>
              )}
              <h3 className="font-bold text-xl mb-2">{p.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">{p.price}</span>
                <span className="text-gray-500 text-base font-normal">{p.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => goToApp()}
                className={`w-full text-sm py-3 rounded-xl font-semibold transition-all ${
                  p.highlight
                    ? 'btn-primary shadow-lg shadow-blue-600/20'
                    : 'btn-outline'
                }`}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-blue-950/20 to-gray-950" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-28 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Não espere ser hackeado para{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              agir
            </span>
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
            Milhares de apps estão online com falhas graves. O seu pode ser o próximo alvo. Descubra em 30 segundos se você está seguro ou exposto.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => goToApp(true)} className="btn-primary text-lg px-10 py-4 shadow-xl shadow-blue-600/20 flex items-center gap-2">
              Analisar agora
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-gray-500 text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Leva menos de 30 segundos
            </p>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-gray-800/50 bg-gray-950">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <Image src="/favicon-32x32.png" alt="DevGuard IA" width={24} height={24} className="rounded-sm" />
                <span className="font-bold text-lg">
                  Dev<span className="text-blue-500">Guard</span> IA
                </span>
              </div>
              <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
                Plataforma de análise de segurança automatizada com inteligência artificial
                para aplicações web modernas.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-300 mb-4">Produto</h4>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">Recursos</a></li>
                <li><a href="#pricing" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">Preços</a></li>
                <li><a href="#how-it-works" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">Como funciona</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-300 mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li><a href="#" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">Termos de uso</a></li>
                <li><a href="#" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">Privacidade</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-sm">© 2026 DevGuard IA. Todos os direitos reservados.</p>
            <p className="text-gray-600 text-xs flex items-center gap-1.5">
              Feito com <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> para devs que se importam com segurança
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Data ─── */

const featureColors = [
  'bg-blue-950/80 text-blue-400',
  'bg-purple-950/80 text-purple-400',
  'bg-cyan-950/80 text-cyan-400',
  'bg-orange-950/80 text-orange-400',
  'bg-green-950/80 text-green-400',
  'bg-red-950/80 text-red-400',
];

const features = [
  {
    icon: <Globe className="w-6 h-6" />,
    title: 'Headers de Segurança',
    description: 'Verificamos HSTS, CSP, X-Frame-Options, CORS e outros 10+ headers essenciais para proteção.',
  },
  {
    icon: <Server className="w-6 h-6" />,
    title: 'Portas Expostas',
    description: 'Detectamos bancos de dados, Redis, SSH e serviços expostos inadvertidamente na internet.',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Explicações com IA',
    description: 'Cada vulnerabilidade vem com explicação em português simples e código de correção pronto.',
  },
  {
    icon: <Lock className="w-6 h-6" />,
    title: 'SSL/TLS & HTTPS',
    description: 'Análise completa de certificados, protocolos e configurações de criptografia em trânsito.',
  },
  {
    icon: <Code2 className="w-6 h-6" />,
    title: 'Injeções & XSS',
    description: 'Teste automático contra SQL Injection, XSS reflexivo e outras falhas OWASP Top 10.',
  },
  {
    icon: <Eye className="w-6 h-6" />,
    title: 'Informações Expostas',
    description: 'Detecção de stack traces, versões de frameworks e dados sensíveis em respostas HTTP.',
  },
];

const steps = [
  {
    icon: <Search className="w-8 h-8" />,
    title: 'Cole a URL',
    description: 'Insira a URL do seu app, API ou site. Funciona com qualquer tecnologia.',
  },
  {
    icon: <Zap className="w-8 h-8" />,
    title: 'Análise automática',
    description: 'Nossa IA analisa headers, portas, SSL, configurações e vulnerabilidades conhecidas.',
  },
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: 'Receba o relatório',
    description: 'Relatório completo com score, vulnerabilidades e correções prontas para aplicar.',
  },
];

const testimonials = [
  {
    name: 'Lucas Oliveira',
    role: 'CTO @ TechStartup',
    quote: 'Encontramos 3 vulnerabilidades críticas no nosso SaaS antes de lançar. O DevGuard IA literalmente salvou nosso produto.',
  },
  {
    name: 'Marina Santos',
    role: 'Full Stack Developer',
    quote: 'Eu uso o Cursor pra gerar código e o DevGuard pra garantir que não estou deployando falhas. Combo perfeito.',
  },
  {
    name: 'Rafael Costa',
    role: 'Founder @ AppBuilder',
    quote: 'As explicações com IA são absurdas. Cada fix vem mastigado, é só copiar e colar. Economizei horas de research.',
  },
];

const severityStyle: Record<string, string> = {
  CRITICAL: 'bg-red-950/50 border-red-800/50 text-red-300',
  HIGH: 'bg-orange-950/50 border-orange-800/50 text-orange-300',
  MEDIUM: 'bg-yellow-950/50 border-yellow-800/50 text-yellow-300',
  LOW: 'bg-blue-950/50 border-blue-800/50 text-blue-300',
  INFO: 'bg-gray-800/50 border-gray-700/50 text-gray-300',
};

const exampleVulns = [
  { title: 'Content-Security-Policy ausente', severity: 'MEDIUM', locked: false },
  { title: 'Site não usa HTTPS', severity: 'HIGH', locked: false },
  { title: 'MySQL exposto na porta 3306', severity: 'CRITICAL', locked: true },
  { title: 'CORS wildcard (*) habilitado', severity: 'HIGH', locked: true },
  { title: 'Server header expondo versão', severity: 'LOW', locked: true },
];

const plans = [
  {
    name: 'Grátis',
    price: 'R$0',
    period: '',
    highlight: false,
    cta: 'Começar grátis',
    features: ['1 scan por dia', '2 vulnerabilidades visíveis', 'Score de segurança', 'Sem cartão necessário'],
  },
  {
    name: 'Scan Completo',
    price: 'R$9,90',
    period: '/scan',
    highlight: false,
    cta: 'Comprar scan',
    features: ['Relatório completo', 'Todas as vulnerabilidades', 'Correções com IA', 'Válido para 1 URL', 'Exportar PDF'],
  },
  {
    name: 'Assinatura Pro',
    price: 'R$39,90',
    period: '/mês',
    highlight: true,
    cta: 'Assinar agora',
    features: [
      'Scans ilimitados',
      'Relatórios completos',
      'Correções com IA',
      'Histórico de scans',
      'Prioridade na fila',
      'Suporte prioritário',
    ],
  },
];
