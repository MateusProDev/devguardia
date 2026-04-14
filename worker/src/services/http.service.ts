interface VulnRaw {
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  description: string;
  solution: string;
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
        {
          header: 'x-xss-protection',
          title: 'X-XSS-Protection ausente',
          severity: 'LOW' as const,
          description: 'O header de proteção contra XSS não está configurado.',
          solution: 'Adicione: X-XSS-Protection: 1; mode=block',
        },
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

      // 3. Information disclosure
      const serverHeader = headers.get('server');
      if (serverHeader && /apache|nginx|iis|php|express/i.test(serverHeader)) {
        vulns.push({
          title: 'Versão do servidor exposta',
          severity: 'LOW',
          description: `O header Server revela informações do software: "${serverHeader}". Isso facilita ataques dirigidos.`,
          solution: 'Remova ou ofusque o header Server nas configurações do seu servidor web.',
        });
      }

      const poweredBy = headers.get('x-powered-by');
      if (poweredBy) {
        vulns.push({
          title: 'X-Powered-By exposto',
          severity: 'LOW',
          description: `O header X-Powered-By revela a tecnologia: "${poweredBy}".`,
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

      // 5. Cookie security
      const setCookieHeader = headers.get('set-cookie');
      if (setCookieHeader) {
        if (!setCookieHeader.includes('Secure')) {
          vulns.push({
            title: 'Cookie sem flag Secure',
            severity: 'MEDIUM',
            description: 'Cookies estão sendo definidos sem a flag Secure, podendo ser transmitidos via HTTP.',
            solution: 'Adicione a flag Secure a todos os cookies: Set-Cookie: nome=valor; Secure; HttpOnly',
          });
        }
        if (!setCookieHeader.includes('HttpOnly')) {
          vulns.push({
            title: 'Cookie sem flag HttpOnly',
            severity: 'MEDIUM',
            description: 'Cookies sem HttpOnly podem ser acessados via JavaScript, facilitando XSS.',
            solution: 'Adicione a flag HttpOnly: Set-Cookie: nome=valor; HttpOnly',
          });
        }
        if (!setCookieHeader.toLowerCase().includes('samesite')) {
          vulns.push({
            title: 'Cookie sem atributo SameSite',
            severity: 'LOW',
            description: 'Sem SameSite, cookies podem ser enviados em requests cross-site (CSRF).',
            solution: 'Adicione SameSite=Strict ou SameSite=Lax aos cookies de sessão.',
          });
        }
      }

      // 6. HTTPS redirect check
      try {
        const httpUrl = url.replace(/^https:\/\//, 'http://');
        if (httpUrl !== url) {
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
          if (httpResp.status < 300 || httpResp.status >= 400 || !location.startsWith('https://')) {
            vulns.push({
              title: 'HTTP não redireciona para HTTPS',
              severity: 'MEDIUM',
              description: 'Acessar o site via HTTP não redireciona automaticamente para HTTPS.',
              solution: 'Configure um redirect 301 de HTTP para HTTPS no servidor.',
            });
          }
        }
      } catch { /* skip if http not available */ }

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

      // 9. Check page body for sensitive info leaks
      const body = await response.text();
      const sensitivePatterns = [
        { pattern: /(?:sk_live_|sk_test_)[a-zA-Z0-9]{20,}/, title: 'Chave Stripe exposta no HTML', severity: 'CRITICAL' as const },
        { pattern: /(?:AKIA|ASIA)[A-Z0-9]{16}/, title: 'AWS Access Key exposta no HTML', severity: 'CRITICAL' as const },
        { pattern: /(?:-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)/, title: 'Chave privada exposta no HTML', severity: 'CRITICAL' as const },
        { pattern: /(?:mongodb\+srv|postgresql|mysql):\/\/[^\s"'<]+/, title: 'String de conexão de banco exposta no HTML', severity: 'CRITICAL' as const },
        { pattern: /(?:password|secret|token|api.?key)\s*[:=]\s*["'][^"']{8,}["']/i, title: 'Possível credencial exposta no HTML', severity: 'HIGH' as const },
      ];

      for (const { pattern, title, severity } of sensitivePatterns) {
        if (pattern.test(body)) {
          vulns.push({
            title,
            severity,
            description: `O HTML da página contém informações sensíveis que podem ser exploradas por atacantes.`,
            solution: 'Remova todas as credenciais e chaves do código frontend. Use variáveis de ambiente no servidor.',
          });
        }
      }

      // 10. Check for common misconfigurations via well-known paths
      const sensitiveEndpoints = [
        { path: '/.env', title: 'Arquivo .env acessível publicamente', severity: 'CRITICAL' as const },
        { path: '/.git/config', title: 'Repositório Git exposto', severity: 'CRITICAL' as const },
        { path: '/wp-admin/', title: 'WordPress admin acessível', severity: 'MEDIUM' as const },
        { path: '/phpinfo.php', title: 'phpinfo() acessível publicamente', severity: 'HIGH' as const },
      ];

      const baseUrl = new URL(url).origin;
      await Promise.all(
        sensitiveEndpoints.map(async ({ path, title, severity }) => {
          try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 5000);
            const r = await fetch(`${baseUrl}${path}`, {
              method: 'HEAD',
              redirect: 'manual',
              signal: ctrl.signal,
              headers: { 'User-Agent': 'DevGuardBot/1.0' },
            });
            clearTimeout(t);
            if (r.status === 200) {
              console.log(`[HTTP] Sensitive path found: ${path} (${r.status})`);
              vulns.push({
                title,
                severity,
                description: `O caminho ${path} está acessível publicamente, expondo informações sensíveis.`,
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
