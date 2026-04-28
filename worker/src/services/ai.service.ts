interface VulnContext {
  title: string;
  severity: string;
  description: string;
}

export class AiWorkerService {
  private readonly apiToken = process.env.CLOUDFLARE_AI_TOKEN || '';
  private readonly accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  private readonly model = '@cf/meta/llama-3.1-8b-instruct';

  // Fallback messages genéricos baseados na severidade
  private getFallbackExplanation(vuln: VulnContext): string {
    const severity = vuln.severity.toLowerCase();
    
    if (severity === 'critical') {
      return `Esta vulnerabilidade ${vuln.title} é crítica e pode permitir que atacantes obtenham controle total do sistema ou exponham dados sensíveis. Recomenda-se correção imediata.`;
    } else if (severity === 'high') {
      return `Esta vulnerabilidade ${vuln.title} representa um risco alto para a segurança da aplicação. Pode permitir acesso não autorizado ou comprometimento de dados. Deve ser corrigida o mais breve possível.`;
    } else if (severity === 'medium') {
      return `Esta vulnerabilidade ${vuln.title} tem impacto moderado. Embora não represente um risco imediato, pode ser explorada em combinação com outras falhas. Recomenda-se corrigir em breve.`;
    } else {
      return `Esta vulnerabilidade ${vuln.title} tem baixo impacto. Representa um risco mínimo, mas deve ser corrigida como parte das boas práticas de segurança.`;
    }
  }

  private getFallbackCodeFix(vuln: VulnContext): string | null {
    const title = vuln.title.toLowerCase();
    
    if (title.includes('header') || title.includes('hsts') || title.includes('csp')) {
      return 'Configure os headers de segurança necessários no seu servidor web (nginx, Apache, ou via middleware no Node.js).';
    } else if (title.includes('ssl') || title.includes('tls') || title.includes('https')) {
      return 'Configure um certificado SSL/TLS válido e force o uso de HTTPS em todas as conexões.';
    } else if (title.includes('cors')) {
      return 'Configure o CORS corretamente, permitindo apenas origens confiáveis e métodos necessários.';
    } else if (title.includes('cookie')) {
      return 'Configure os cookies com as flags Secure, HttpOnly e SameSite apropriadas.';
    } else {
      return null;
    }
  }

  async explain(vuln: VulnContext): Promise<{ explanation: string | null; codeFix: string | null }> {
    if (!this.apiToken || !this.accountId) {
      console.warn('[AI] Missing CLOUDFLARE_AI_TOKEN or CLOUDFLARE_ACCOUNT_ID — using fallback');
      return {
        explanation: this.getFallbackExplanation(vuln),
        codeFix: this.getFallbackCodeFix(vuln),
      };
    }

    try {
      const prompt = `Você é um especialista sênior em segurança web e pentest. Analise esta vulnerabilidade e forneça uma resposta DETALHADA e PRÁTICA.

Vulnerabilidade: ${vuln.title}
Severidade: ${vuln.severity}
Descrição técnica: ${vuln.description}

Responda APENAS com JSON válido (sem markdown, sem texto antes ou depois):
{
  "explanation": "Explicação detalhada do impacto real desta vulnerabilidade: o que um atacante pode fazer, quais dados ficam expostos, e por que isso é perigoso. Mínimo 3-4 frases em português brasileiro.",
  "codeFix": "Exemplo prático de código ou configuração para corrigir esta vulnerabilidade. Use o formato mais comum (nginx, Apache, Node.js, etc). Se não aplicável, use null."
}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiToken}`,
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: 'Você é um especialista em segurança web. Responda sempre em JSON válido, sem markdown.' },
              { role: 'user', content: prompt },
            ],
            max_tokens: 700,
            temperature: 0.4,
          }),
        },
      );

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[AI] Cloudflare API error: ${response.status} ${response.statusText} — using fallback`);
        return {
          explanation: this.getFallbackExplanation(vuln),
          codeFix: this.getFallbackCodeFix(vuln),
        };
      }

      const data = await response.json();
      const text = data.result?.response || '';

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(`[AI] Could not parse JSON from response: ${text.substring(0, 200)} — using fallback`);
        return {
          explanation: this.getFallbackExplanation(vuln),
          codeFix: this.getFallbackCodeFix(vuln),
        };
      }

      const content = JSON.parse(jsonMatch[0]);

      const explanation = content.explanation && content.explanation !== vuln.description
        ? content.explanation
        : null;

      const codeFix = content.codeFix
        ? typeof content.codeFix === 'string' ? content.codeFix : JSON.stringify(content.codeFix)
        : null;

      return {
        explanation: typeof explanation === 'string' ? explanation : null,
        codeFix,
      };
    } catch (err) {
      console.warn(`[AI] Error enriching "${vuln.title}": ${err} — using fallback`);
      return {
        explanation: this.getFallbackExplanation(vuln),
        codeFix: this.getFallbackCodeFix(vuln),
      };
    }
  }
}
