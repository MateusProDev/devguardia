interface VulnRaw {
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  description: string;
  solution: string;
}

const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB — o suficiente para qualquer HTML real

/** Reads up to maxBytes of a response body, avoids OOM on huge pages. */
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

/** Strips HTML/JS comments so credential regex doesn't match documentation examples. */
function stripCommentsAndStrings(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/** Returns true if the value looks like a placeholder / example / mock and not a real secret. */
function looksLikePlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  const placeholderWords = [
    'example', 'exemplo', 'placeholder', 'your_', 'your-', 'sample', 'mock', 'dummy',
    'test123', 'password123', 'senha123', 'xxxxx', '123456', 'abcdef', 'changeme',
    '<your', '{your', 'insert_', 'replace_', 'todo', 'fixme', 'lorem',
  ];
  if (placeholderWords.some(w => lower.includes(w))) return true;
  // Low entropy: all same char, sequential, or < 4 distinct chars
  const distinct = new Set(value).size;
  if (distinct < 4) return true;
  return false;
}

export class HttpAnalyzerService {
  async analyze(url: string): Promise<VulnRaw[]> {
    const vulns: VulnRaw[] = [];

    try {
      console.log(`[HTTP] Analyzing ${url}...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': 'DevGuardBot/1.0 (+https://devguard.ai/bot)' },
      });

      clearTimeout(timeout);

      const headers = response.headers;
      const finalUrl = response.url;

      console.log(`[HTTP] Response: ${response.status} from ${finalUrl}`);
      console.log(`[HTTP] Headers present: ${[...headers.keys()].join(', ')}`);

      // 1. HTTPS Check
      if (!finalUrl.startsWith('https://')) {
        vulns.push({
          title: 'Site não usa HTTPS',
          severity: 'HIGH',
          description: 'O site não usa criptografia TLS/SSL, expondo dados dos usuários em texto puro.',
          solution: 'Configure um certificado SSL (Let\'s Encrypt é gratuito) e redirecione HTTP para HTTPS.',
        });
      }

      // 2. Security Headers
      const securityHeaders = [
        {
          header: 'strict-transport-security',
          title: 'Header HSTS ausente',
          severity: 'MEDIUM' as const,
          description: 'O header HTTP Strict-Transport-Security (HSTS) não está configurado.',
          solution: 'Adicione: Strict-Transport-Security: max-age=31536000; includeSubDomains',
        },
        {
          header: 'x-content-type-options',
          title: 'X-Content-Type-Options ausente',
          severity: 'LOW' as const,
          description: 'O header X-Content-Type-Options não está presente, permitindo MIME sniffing.',
          solution: 'Adicione: X-Content-Type-Options: nosniff',
        },
        {
          header: 'x-frame-options',
          title: 'X-Frame-Options ausente',
          severity: 'MEDIUM' as const,
          description: 'O site pode ser embutido em iframes, facilitando ataques de clickjacking.',
          solution: 'Adicione: X-Frame-Options: DENY ou SAMEORIGIN',
        },
        {
          header: 'content-security-policy',
          title: 'Content-Security-Policy ausente',
          severity: 'MEDIUM' as const,
          description: 'Sem CSP, o site é vulnerável a ataques XSS via scripts injetados.',
          solution: 'Configure uma política CSP adequada. Exemplo: Content-Security-Policy: default-src \'self\'',
        },
        // X-XSS-Protection removido: header obsoleto
        {
          header: 'referrer-policy',
          title: 'Referrer-Policy ausente',
          severity: 'LOW' as const,
          description: 'Sem Referrer-Policy, o browser pode vazar URLs sensíveis em requests.',
          solution: 'Adicione: Referrer-Policy: strict-origin-when-cross-origin',
        },
        {
          header: 'permissions-policy',
          title: 'Permissions-Policy ausente',
          severity: 'INFO' as const,
          description: 'Sem Permissions-Policy, o site não restringe acesso a APIs sensíveis do browser.',
          solution: 'Adicione: Permissions-Policy: camera=(), microphone=(), geolocation=()',
        },
      ];

      for (const check of securityHeaders) {
        if (!headers.get(check.header)) {
          vulns.push({
            title: check.title,
            severity: check.severity,
            description: check.description,
            solution: check.solution,
          });
        }
      }

      // 3. Information disclosure — só reporta se a VERSÃO estiver exposta (com números)
      const serverHeader = headers.get('server');
      if (serverHeader && /(apache|nginx|iis|openssl|php|express|tomcat|lighttpd|caddy)[\/ ][\d.]+/i.test(serverHeader)) {
        vulns.push({
          title: 'Versão do servidor exposta',
          severity: 'LOW',
          description: `O header Server revela a versão exata do software: "${serverHeader}". Isso facilita ataques dirigidos a CVEs conhecidas da versão.`,
          solution: 'Remova ou ofusque a versão no header Server nas configurações do seu servidor web (ex: nginx server_tokens off;).',
        });
      }

      const poweredBy = headers.get('x-powered-by');
      // Só reporta se tiver versão numérica (ex: "PHP/7.4.3", "Express/4.18")
      if (poweredBy && /[\d.]+/.test(poweredBy)) {
        vulns.push({
          title: 'X-Powered-By expõe versão da tecnologia',
          severity: 'LOW',
          description: `O header X-Powered-By revela a tecnologia e versão: "${poweredBy}".`,
          solution: 'Remova o header X-Powered-By. Em Express.js: app.disable("x-powered-by")',
        });
      }

      // 4. CORS check
      const corsHeader = headers.get('access-control-allow-origin');
      if (corsHeader === '*') {
        vulns.push({
          title: 'CORS muito permissivo (wildcard)',
          severity: 'HIGH',
          description: 'O header CORS está configurado como "*", permitindo qualquer origem fazer requests.',
          solution:
            'Restrinja o CORS para origens específicas: Access-Control-Allow-Origin: https://seudominio.com',
        });
      }

      // 5. Cookie security — valida CADA cookie individualmente, só reporta os sensíveis/de sessão
      const setCookieList: string[] =
        typeof (headers as any).getSetCookie === 'function'
          ? (headers as any).getSetCookie()
          : (headers.get('set-cookie') ? [headers.get('set-cookie')!] : []);

      const sessionCookieRegex = /^(session|sess|sid|auth|token|jwt|connect\.sid|phpsessid|jsessionid|asp\.?net_sessionid|laravel_session|_session)/i;
      const cookiesWithoutSecure: string[] = [];
      const cookiesWithoutHttpOnly: string[] = [];
      const cookiesWithoutSameSite: string[] = [];

      for (const raw of setCookieList) {
        const name = raw.split('=')[0]?.trim() || '';
        const isSessionLike = sessionCookieRegex.test(name);
        const lower = raw.toLowerCase();
        const hasSecure = /;\s*secure(\s*;|\s*$)/i.test(raw);
        const hasHttpOnly = /;\s*httponly(\s*;|\s*$)/i.test(raw);
        const hasSameSite = /;\s*samesite=/i.test(lower);

        // Secure: só é problema se o site for HTTPS e o cookie não tiver Secure
        if (finalUrl.startsWith('https://') && !hasSecure) cookiesWithoutSecure.push(name);
        // HttpOnly: só faz sentido em cookies de sessão/auth. CSRF tokens e prefs do usuário não precisam.
        if (isSessionLike && !hasHttpOnly) cookiesWithoutHttpOnly.push(name);
        // SameSite: só reportamos em cookies de sessão
        if (isSessionLike && !hasSameSite) cookiesWithoutSameSite.push(name);
      }

      if (cookiesWithoutSecure.length > 0) {
        vulns.push({
          title: 'Cookie(s) sem flag Secure em site HTTPS',
          severity: 'MEDIUM',
          description: `Os cookies [${cookiesWithoutSecure.join(', ')}] são definidos sem a flag Secure em um site HTTPS, podendo ser transmitidos via HTTP em cenários de downgrade.`,
          solution: 'Adicione a flag Secure aos cookies: Set-Cookie: nome=valor; Secure; HttpOnly; SameSite=Lax',
        });
      }
      if (cookiesWithoutHttpOnly.length > 0) {
        vulns.push({
          title: 'Cookie de sessão sem flag HttpOnly',
          severity: 'MEDIUM',
          description: `Os cookies de sessão [${cookiesWithoutHttpOnly.join(', ')}] não têm HttpOnly, permitindo acesso via JavaScript e facilitando roubo de sessão via XSS.`,
          solution: 'Adicione a flag HttpOnly aos cookies de sessão: Set-Cookie: session=valor; HttpOnly',
        });
      }
      if (cookiesWithoutSameSite.length > 0) {
        vulns.push({
          title: 'Cookie de sessão sem atributo SameSite',
          severity: 'LOW',
          description: `Os cookies de sessão [${cookiesWithoutSameSite.join(', ')}] não definem SameSite, aumentando risco de CSRF.`,
          solution: 'Adicione SameSite=Strict ou SameSite=Lax aos cookies de sessão.',
        });
      }

      // 6. HTTPS redirect check — ignora se HSTS preload está ativo (browser já força HTTPS)
      const hsts = headers.get('strict-transport-security') || '';
      const hasHstsPreload = /preload/i.test(hsts) && /max-age=\s*\d{7,}/i.test(hsts);

      try {
        const httpUrl = url.replace(/^https:\/\//, 'http://');
        if (httpUrl !== url && !hasHstsPreload) {
          const httpController = new AbortController();
          const httpTimeout = setTimeout(() => httpController.abort(), 5000);
          const httpResp = await fetch(httpUrl, {
            method: 'HEAD',
            redirect: 'manual',
            signal: httpController.signal,
            headers: { 'User-Agent': 'DevGuardBot/1.0' },
          });
          clearTimeout(httpTimeout);
          const location = httpResp.headers.get('location') || '';
          const isRedirect = httpResp.status >= 300 && httpResp.status < 400;
          const redirectsToHttps = location.startsWith('https://') || (location.startsWith('/') && finalUrl.startsWith('https://'));
          // Só reporta se HTTP RESPONDEU (status 2xx explícito) OU redirecionou para outro HTTP
          if ((httpResp.status >= 200 && httpResp.status < 300) || (isRedirect && !redirectsToHttps && location.startsWith('http://'))) {
            vulns.push({
              title: 'HTTP não redireciona para HTTPS',
              severity: 'MEDIUM',
              description: 'Acessar o site via HTTP retorna conteúdo ou redireciona para outra URL HTTP sem criptografia.',
              solution: 'Configure redirect 301 de HTTP para HTTPS no servidor e habilite HSTS com preload.',
            });
          }
        }
      } catch { /* HTTP inacessível é o comportamento correto — não reporta nada */ }

      // 7. Cross-Origin-Opener-Policy
      if (!headers.get('cross-origin-opener-policy')) {
        vulns.push({
          title: 'Cross-Origin-Opener-Policy ausente',
          severity: 'LOW',
          description: 'Sem COOP, o site pode ser vulnerável a ataques cross-origin via window references.',
          solution: 'Adicione: Cross-Origin-Opener-Policy: same-origin-allow-popups',
        });
      }

      // 8. Cross-Origin-Resource-Policy
      if (!headers.get('cross-origin-resource-policy')) {
        vulns.push({
          title: 'Cross-Origin-Resource-Policy ausente',
          severity: 'INFO',
          description: 'Sem CORP, recursos do site podem ser carregados por origens externas.',
          solution: 'Adicione: Cross-Origin-Resource-Policy: same-origin',
        });
      }

      // 9. Check page body for sensitive info leaks (com validação de contexto)
      const rawBody = await readBodyLimited(response);
      const body = stripCommentsAndStrings(rawBody);

      // Patterns de alta confiança — formato exato, baixo risco de falso positivo
      const highConfidencePatterns = [
        { pattern: /(?:sk_live_)[a-zA-Z0-9]{24,}/g, title: 'Chave Stripe LIVE exposta no HTML', severity: 'CRITICAL' as const },
        { pattern: /(?:sk_test_)[a-zA-Z0-9]{24,}/g, title: 'Chave Stripe TEST exposta no HTML', severity: 'HIGH' as const },
        { pattern: /(?:AKIA|ASIA)[A-Z0-9]{16}/g, title: 'AWS Access Key exposta no HTML', severity: 'CRITICAL' as const },
        { pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, title: 'Chave privada exposta no HTML', severity: 'CRITICAL' as const },
        { pattern: /(?:mongodb(?:\+srv)?|postgresql|mysql|redis):\/\/[^:\s"'<>]+:[^@\s"'<>]+@[^\s"'<>]+/g, title: 'String de conexão de banco com credenciais exposta', severity: 'CRITICAL' as const },
        { pattern: /ghp_[a-zA-Z0-9]{36,}/g, title: 'GitHub Personal Access Token exposto', severity: 'CRITICAL' as const },
        { pattern: /xox[baprs]-[a-zA-Z0-9-]{10,}/g, title: 'Slack token exposto', severity: 'HIGH' as const },
      ];

      for (const { pattern, title, severity } of highConfidencePatterns) {
        const matches = body.match(pattern);
        if (matches && matches.some(m => !looksLikePlaceholder(m))) {
          vulns.push({
            title,
            severity,
            description: `O HTML da página contém credenciais em formato de chave real (não placeholder). Atacantes podem extrair e usar essas chaves.`,
            solution: 'Remova todas as credenciais reais do código frontend. Use variáveis de ambiente no servidor e nunca exponha chaves ao browser.',
          });
        }
      }

      // Pattern de baixa confiança — só reporta se aparecer em contexto suspeito (ex: <script>, JSON embutido)
      const genericCredPattern = /(?:password|passwd|secret|api[_-]?key|apikey|access[_-]?token|auth[_-]?token)\s*[:=]\s*["']([^"']{12,})["']/gi;
      const genericMatches = [...body.matchAll(genericCredPattern)];
      const suspiciousGenericMatches = genericMatches.filter(m => {
        const value = m[1];
        if (looksLikePlaceholder(value)) return false;
        // Precisa ter entropia mínima: mix de letras e números/símbolos
        const hasLetters = /[a-zA-Z]/.test(value);
        const hasDigitsOrSymbols = /[\d!@#$%^&*()\-_+=]/.test(value);
        return hasLetters && hasDigitsOrSymbols;
      });
      if (suspiciousGenericMatches.length > 0) {
        vulns.push({
          title: 'Possível credencial hardcoded no HTML',
          severity: 'HIGH',
          description: `Foram encontradas ${suspiciousGenericMatches.length} ocorrência(s) de padrões como "password"/"api_key" com valor de aparência real (não placeholder). Revise manualmente.`,
          solution: 'Remova credenciais reais do frontend. Use variáveis de ambiente no servidor e proxy autenticado para APIs.',
        });
      }

      // 10. Check for common misconfigurations via well-known paths
      const sensitiveEndpoints = [
        {
          path: '/.env',
          title: 'Arquivo .env acessível publicamente',
          severity: 'CRITICAL' as const,
          validate: async (res: Response) => {
            if (res.status !== 200) return false;
            const text = await res.text();
            return /DB_|DATABASE_|SECRET|TOKEN|PASSWORD|USER|HOST|PORT|=/.test(text);
          },
        },
        {
          path: '/.git/config',
          title: 'Repositório Git exposto',
          severity: 'CRITICAL' as const,
          validate: async (res: Response) => {
            if (res.status !== 200) return false;
            const text = await res.text();
            return text.includes('[core]') && text.includes('repositoryformatversion');
          },
        },
        {
          path: '/wp-admin/',
          title: 'WordPress admin acessível',
          severity: 'MEDIUM' as const,
          validate: async (res: Response) => {
            if (res.status !== 200) return false;
            const text = await res.text();
            return /wp-admin|WordPress|wp-login|user_login|Lost your password/i.test(text);
          },
        },
        {
          path: '/phpinfo.php',
          title: 'phpinfo() acessível publicamente',
          severity: 'HIGH' as const,
          validate: async (res: Response) => {
            if (res.status !== 200) return false;
            const text = await res.text();
            return /<title>phpinfo\(\)<\/title>|PHP Version|phpinfo\(/i.test(text);
          },
        },
      ];

      const baseUrl = new URL(url).origin;
      await Promise.all(
        sensitiveEndpoints.map(async ({ path, title, severity, validate }) => {
          try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 5000);
            const r = await fetch(`${baseUrl}${path}`, {
              method: 'GET',
              redirect: 'manual',
              signal: ctrl.signal,
              headers: { 'User-Agent': 'DevGuardBot/1.0' },
            });
            clearTimeout(t);
            if (await validate(r)) {
              console.log(`[HTTP] Sensitive path found: ${path} (${r.status})`);
              vulns.push({
                title,
                severity,
                description: `O caminho ${path} está acessível publicamente, expondo informações sensíveis reais.`,
                solution: `Bloqueie o acesso a ${path} no servidor web. Nunca exponha arquivos de configuração.`,
              });
            }
          } catch { /* ignore timeouts */ }
        }),
      );

      console.log(`[HTTP] Analysis complete for ${url}: ${vulns.length} vulns found`);

    } catch (err) {
      console.error(`[HTTP] Analysis FAILED for ${url}: ${err}`);
      vulns.push({
        title: 'Site inacessível ou timeout',
        severity: 'INFO',
        description: 'Não foi possível acessar o site para análise completa.',
        solution: 'Verifique se o site está online e acessível.',
      });
    }

    return vulns;
  }
}
