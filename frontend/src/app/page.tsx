
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
    <div className="min-h-screen bg-black text-gray-100 overflow-x-hidden font-mono">
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
                name: 'Starter',
                description: '5 scans/dia com Nmap básico e explicações IA',
              },
              {
                '@type': 'Offer',
                price: '99.90',
                priceCurrency: 'BRL',
                name: 'Pro',
                description: '30 scans/dia com varredura agressiva e fila prioritária',
              },
            ],
          }),
        }}
      />

      {/* ═══════ NAVBAR ═══════ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
          scrolled
            ? 'bg-black/90 backdrop-blur-md border-green-900/30'
            : 'bg-black/50 border-green-900/20'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500/20 border border-green-500/50 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-green-500" />
            </div>
            <span className="font-bold text-lg tracking-wider">
              DEV<span className="text-green-500">GUARD</span>
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-500 hover:text-green-400 text-sm transition-colors uppercase tracking-wider">
              [RECURSOS]
            </a>
            <a href="#how-it-works" className="text-gray-500 hover:text-green-400 text-sm transition-colors uppercase tracking-wider">
              [COMO FUNCIONA]
            </a>
            <a href="#pricing" className="text-gray-500 hover:text-green-400 text-sm transition-colors uppercase tracking-wider">
              [PREÇOS]
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => goToApp()} className="text-gray-500 hover:text-green-400 text-sm py-2 px-4 border border-gray-800 hover:border-green-500/50 transition-all uppercase tracking-wider">
              &lt;LOGIN/&gt;
            </button>
            <button onClick={() => goToApp()} className="bg-green-600/20 text-green-400 border border-green-500/50 hover:bg-green-600/30 text-sm py-2 px-5 transition-all uppercase tracking-wider">
              &lt;INICIAR/&gt;
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-gray-500 hover:text-green-400"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label={mobileMenu ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenu}
            aria-controls="mobile-menu"
          >
            {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div id="mobile-menu" className="md:hidden bg-black/95 border-t border-green-900/30 px-6 py-6 space-y-4" role="menu">
            <a href="#features" className="block text-gray-400 hover:text-green-400 transition-colors uppercase tracking-wider" onClick={() => setMobileMenu(false)}>
              [RECURSOS]
            </a>
            <a href="#how-it-works" className="block text-gray-400 hover:text-green-400 transition-colors uppercase tracking-wider" onClick={() => setMobileMenu(false)}>
              [COMO FUNCIONA]
            </a>
            <a href="#pricing" className="block text-gray-400 hover:text-green-400 transition-colors uppercase tracking-wider" onClick={() => setMobileMenu(false)}>
              [PREÇOS]
            </a>
            <button onClick={() => goToApp()} className="w-full bg-green-600/20 text-green-400 border border-green-500/50 py-3 uppercase tracking-wider">
              &lt;INICIAR/&gt;
            </button>
          </div>
        )}
      </nav>

      {/* ═══════ HERO SECTION ═══════ */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-32">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Matrix-like grid */}
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 255, 0, .1) 25%, rgba(0, 255, 0, .1) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, .1) 75%, rgba(0, 255, 0, .1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 0, .1) 25%, rgba(0, 255, 0, .1) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, .1) 75%, rgba(0, 255, 0, .1) 76%, transparent 77%, transparent)',
              backgroundSize: '50px 50px',
            }}
          />
          {/* Scan line effect */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent animate-pulse" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent animate-pulse" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          {/* Terminal-style badge */}
          <div className="inline-flex items-center gap-2 bg-black border border-green-500/30 text-green-400 text-xs px-4 py-2 mb-8 font-mono">
            <span className="w-2 h-2 bg-green-500 animate-pulse" />
            <span className="opacity-70">root@devguard:~$</span>
            <span className="opacity-50">scanning...</span>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-8 tracking-tight">
            <span className="text-gray-500">&lt;</span>
            <span className="text-green-400">SYSTEM</span>
            <span className="text-gray-500">&gt;</span>
            <br />
            <span className="text-white">SECURITY</span>
            <span className="text-red-500 animate-pulse">_</span>
            <br />
            <span className="text-gray-500">&lt;/</span>
            <span className="text-green-400">SYSTEM</span>
            <span className="text-gray-500">&gt;</span>
          </h1>

          <p className="text-sm sm:text-base text-gray-500 max-w-2xl mx-auto mb-12 font-mono leading-relaxed">
            <span className="text-green-500">$</span> detect_vulnerabilities --target=your_app --mode=aggressive
          </p>

          {/* CTA Input - Terminal style */}
          <div className="max-w-2xl mx-auto">
            <div className="relative bg-black border border-green-500/30 p-1">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-green-500/20">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="text-gray-600 text-xs ml-2">devguard_terminal</span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-green-500 text-sm mb-3">
                  <span>$</span>
                  <span className="opacity-70">scan --url</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    placeholder="https://target-domain.com"
                    className="flex-1 bg-black/50 border border-green-500/20 text-green-400 placeholder-gray-700 px-4 py-3 outline-none text-sm font-mono focus:border-green-500/50 transition-colors"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <button
                    onClick={() => goToApp(true)}
                    className="bg-green-600/20 text-green-400 border border-green-500/50 hover:bg-green-600/30 px-6 py-3 text-sm font-mono uppercase tracking-wider transition-all"
                  >
                    &lt;EXECUTE/&gt;
                  </button>
                </div>
              </div>
            </div>
            <p className="text-gray-600 text-xs mt-4 font-mono">
              [INFO] 1 free scan/day | no credit card required
            </p>
          </div>

          {/* Tech stack */}
          <div className="mt-16">
            <p className="text-gray-700 text-xs uppercase tracking-widest mb-4 font-mono">
              // POWERED_BY
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {['NMAP', 'OWASP', 'BULLMQ', 'REDIS', 'PRISMA', 'NESTJS', 'NEXTJS', 'CLOUDFLARE'].map((name) => (
                <span key={name} className="text-gray-600 text-xs font-mono border border-gray-800 px-2 py-1">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ STATS BAR ═══════ */}
      <section className="border-y border-green-900/20 bg-black/50">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div ref={stats.scans.ref} className="border border-green-500/10 p-6">
            <div className="text-3xl md:text-4xl font-bold text-green-400 mb-2 font-mono">
              {stats.scans.count.toLocaleString('pt-BR')}
            </div>
            <p className="text-gray-600 text-xs font-mono uppercase tracking-wider">
              // SCANS_EXECUTED
            </p>
          </div>
          <div ref={stats.vulns.ref} className="border border-red-500/10 p-6">
            <div className="text-3xl md:text-4xl font-bold text-red-400 mb-2 font-mono">
              {stats.vulns.count.toLocaleString('pt-BR')}
            </div>
            <p className="text-gray-600 text-xs font-mono uppercase tracking-wider">
              // VULNERABILITIES_FOUND
            </p>
          </div>
          <div ref={stats.users.ref} className="border border-green-500/10 p-6">
            <div className="text-3xl md:text-4xl font-bold text-green-400 mb-2 font-mono">
              {stats.users.count.toLocaleString('pt-BR')}
            </div>
            <p className="text-gray-600 text-xs font-mono uppercase tracking-wider">
              // ACTIVE_USERS
            </p>
          </div>
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section id="features" className="relative max-w-7xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-green-400 text-xs font-mono mb-4 border border-green-500/30 px-3 py-1">
            <span className="w-1.5 h-1.5 bg-green-500 animate-pulse" />
            <span>DETECTION_MODULES</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 font-mono tracking-tight">
            &lt;SCAN_VECTORS/&gt;
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto text-sm font-mono">
            // Automated vulnerability detection across multiple attack vectors
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group relative bg-black border border-green-500/20 p-5 hover:border-green-500/40 transition-all duration-300"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-green-500/0 group-hover:bg-green-500/50 transition-all" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-green-500 text-xs font-mono">0{i + 1}</span>
                  <div className={`w-8 h-8 flex items-center justify-center ${featureColors[i % featureColors.length]}`}>
                    {f.icon}
                  </div>
                </div>
                <h3 className="font-mono text-sm font-semibold mb-2 text-green-400">{f.title}</h3>
                <p className="text-gray-600 text-xs leading-relaxed font-mono">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how-it-works" className="relative border-y border-green-900/20 bg-black/30">
        <div className="max-w-7xl mx-auto px-6 py-28">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-green-400 text-xs font-mono mb-4 border border-green-500/30 px-3 py-1">
              <Terminal className="w-3 h-3" />
              <span>EXECUTION_FLOW</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 font-mono tracking-tight">
              &lt;SCAN_PROCESS/&gt;
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto text-sm font-mono">
              // Automated security assessment pipeline
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={s.title} className="relative">
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-4 left-[70%] w-[30%] h-px bg-green-500/20" />
                )}
                <div className="bg-black border border-green-500/20 p-6 relative">
                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-green-500 text-black text-xs font-bold flex items-center justify-center font-mono">
                    {i + 1}
                  </div>
                  <div className="text-green-500 mb-4">{s.icon}</div>
                  <h3 className="font-mono text-sm font-semibold mb-2 text-green-400">{s.title}</h3>
                  <p className="text-gray-600 text-xs font-mono">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ LIVE DEMO / SCORE PREVIEW ═══════ */}
      <section className="max-w-7xl mx-auto px-6 py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-red-400 text-xs font-mono mb-4 border border-red-500/30 px-3 py-1">
              <BarChart3 className="w-3 h-3" />
              <span>SCAN_OUTPUT</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 font-mono tracking-tight">
              &lt;VULNERABILITY_REPORT/&gt;
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed text-sm font-mono">
              // Real-time vulnerability detection with AI-powered remediation
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Security score: 0-100 rating',
                'Severity-based categorization',
                'Copy-paste ready fixes',
                'Plain language explanations',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-green-500 font-mono text-xs">[+]</span>
                  <span className="text-gray-400 text-xs font-mono">{item}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => goToApp(true)} className="bg-green-600/20 text-green-400 border border-green-500/50 hover:bg-green-600/30 px-6 py-3 text-sm font-mono uppercase tracking-wider transition-all">
              &lt;INITIATE_SCAN/&gt;
            </button>
          </div>

          {/* Scan result card - Terminal style */}
          <div className="relative">
            <div className="bg-black border border-green-500/30 rounded-lg overflow-hidden">
              {/* Terminal header */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-green-500/20 bg-black/50">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="text-gray-600 text-xs ml-2 font-mono">scan_results.log</span>
              </div>
              {/* Terminal content */}
              <div className="p-4 font-mono text-xs">
                <div className="text-gray-600 mb-2">
                  <span className="text-green-500">$</span> nmap -sV --script vuln target.com
                </div>
                <div className="text-gray-500 mb-4">
                  Starting Nmap 7.94 ( https://nmap.org )
                </div>
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-gray-400">example-startup.vercel.app</span>
                  </div>
                  <div className="text-red-400 text-2xl font-bold mb-1">SCORE: 42/100</div>
                  <div className="text-red-400/70 text-xs">CRITICAL_VULNERABILITIES_DETECTED</div>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1 bg-gray-800 rounded mb-4">
                  <div className="h-full w-[42%] bg-red-500 rounded" />
                </div>
                {/* Vulnerabilities */}
                <div className="space-y-2">
                  {exampleVulns.map((v) => (
                    <div
                      key={v.title}
                      className={`flex items-center gap-2 p-2 border ${severityStyle[v.severity]}`}
                    >
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{v.title}</p>
                        <p className="text-[10px] opacity-60">{v.severity}</p>
                      </div>
                      {v.locked && (
                        <span className="text-[10px] text-gray-600 border border-gray-800 px-1">[LOCKED]</span>
                      )}
                    </div>
                  ))}
                </div>
                {/* Upsell */}
                <div className="mt-4 p-3 border border-green-500/20 text-center">
                  <p className="text-green-400/70 text-xs mb-2">
                    +3 hidden vulnerabilities detected
                  </p>
                  <button onClick={() => goToApp()} className="text-green-400 text-xs font-mono hover:underline">
                    [UNLOCK_FULL_REPORT]
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section className="border-y border-green-900/20 bg-black/30">
        <div className="max-w-7xl mx-auto px-6 py-28">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-green-400 text-xs font-mono mb-4 border border-green-500/30 px-3 py-1">
              <Star className="w-3 h-3" />
              <span>USER_FEEDBACK</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono tracking-tight">
              &lt;OPERATOR_LOGS/&gt;
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-black border border-green-500/20 p-5 hover:border-green-500/40 transition-colors">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 text-green-500 fill-green-500" />
                  ))}
                </div>
                <p className="text-gray-500 text-xs leading-relaxed mb-4 font-mono">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-500/20 border border-green-500/50 flex items-center justify-center text-green-400 font-bold text-xs font-mono">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-mono text-xs text-green-400">{t.name}</p>
                    <p className="text-gray-600 text-[10px] font-mono">{t.role}</p>
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
          <div className="inline-flex items-center gap-2 text-green-400 text-xs font-mono mb-4 border border-green-500/30 px-3 py-1">
            <TrendingUp className="w-3 h-3" />
            <span>ACCESS_LEVELS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 font-mono tracking-tight">
            &lt;SUBSCRIPTION_TIERS/&gt;
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto text-sm font-mono">
            // Choose your security clearance level
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative bg-black border p-6 transition-all duration-300 ${
                p.highlight
                  ? 'border-green-500/50 ring-1 ring-green-500/20'
                  : 'border-green-500/20 hover:border-green-500/40'
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 text-black text-[10px] font-bold px-3 py-1 font-mono uppercase tracking-wider">
                  [RECOMMENDED]
                </div>
              )}
              <h3 className="font-mono text-sm font-bold mb-2 text-green-400">{p.name}</h3>
              <div className="mb-4">
                <span className="text-2xl font-bold text-white">{p.price}</span>
                <span className="text-gray-600 text-sm font-normal">{p.period}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                    <span className="text-green-500">[+]</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => goToApp()}
                className={`w-full text-xs py-2 font-mono uppercase tracking-wider transition-all ${
                  p.highlight
                    ? 'bg-green-600/20 text-green-400 border border-green-500/50 hover:bg-green-600/30'
                    : 'text-gray-500 border border-gray-800 hover:border-green-500/30 hover:text-green-400'
                }`}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="relative overflow-hidden border-t border-green-900/20">
        <div className="absolute inset-0 bg-black" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-green-500/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-28 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 font-mono tracking-tight">
            &lt;INITIATE_SCAN_NOW/&gt;
          </h2>
          <p className="text-gray-600 text-sm mb-10 max-w-2xl mx-auto font-mono">
            // Don't wait for a breach. Proactive security assessment in 30 seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => goToApp(true)} className="bg-green-600/20 text-green-400 border border-green-500/50 hover:bg-green-600/30 px-8 py-3 text-sm font-mono uppercase tracking-wider transition-all flex items-center gap-2">
              &lt;EXECUTE_SCAN/&gt;
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-gray-600 text-xs font-mono flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              &lt;30s_execution_time/&gt;
            </p>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-green-900/20 bg-black">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                  <Terminal className="w-4 h-4 text-green-500" />
                </div>
                <span className="font-bold text-sm font-mono tracking-wider">
                  DEV<span className="text-green-500">GUARD</span>
                </span>
              </div>
              <p className="text-gray-600 text-xs max-w-sm leading-relaxed font-mono">
                // Automated security assessment platform with AI-powered vulnerability detection
              </p>
            </div>
            <div>
              <h4 className="font-mono text-xs text-green-400 mb-4 uppercase tracking-wider">
                [MODULES]
              </h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-600 hover:text-green-400 text-xs font-mono transition-colors">features</a></li>
                <li><a href="#pricing" className="text-gray-600 hover:text-green-400 text-xs font-mono transition-colors">pricing</a></li>
                <li><a href="#how-it-works" className="text-gray-600 hover:text-green-400 text-xs font-mono transition-colors">docs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-xs text-green-400 mb-4 uppercase tracking-wider">
                [LEGAL]
              </h4>
              <ul className="space-y-2">
                <li><a href="/terms" className="text-gray-600 hover:text-green-400 text-xs font-mono transition-colors">terms</a></li>
                <li><a href="/privacy" className="text-gray-600 hover:text-green-400 text-xs font-mono transition-colors">privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-green-900/20 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-700 text-xs font-mono">© 2026 DevGuard. All systems operational.</p>
            <p className="text-gray-700 text-[10px] font-mono flex items-center gap-1.5">
              <span className="text-green-500">root@devguard:~$</span>
              <span>security_first</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Data ─── */

const featureColors = [
  'bg-green-950/80 text-green-400',
  'bg-red-950/80 text-red-400',
  'bg-yellow-950/80 text-yellow-400',
  'bg-cyan-950/80 text-cyan-400',
  'bg-purple-950/80 text-purple-400',
  'bg-orange-950/80 text-orange-400',
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
    name: 'Starter',
    price: 'R$39,90',
    period: '/mês',
    highlight: false,
    cta: 'Assinar Starter',
    features: [
      '5 scans/dia (50/mês)',
      'Nmap: 10 portas',
      'Explicações com IA',
      'Histórico 30 dias',
    ],
  },
  {
    name: 'Pro',
    price: 'R$99,90',
    period: '/mês',
    highlight: true,
    cta: 'Assinar Pro',
    features: [
      '30 scans/dia (300/mês)',
      'Varredura agressiva',
      'Detecção de serviços',
      'Fila prioritária',
      'Histórico 90 dias',
    ],
  },
];
