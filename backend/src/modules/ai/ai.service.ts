import { Injectable, Logger } from '@nestjs/common';

interface VulnContext {
  title: string;
  severity: string;
  description: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiToken = process.env.CLOUDFLARE_AI_TOKEN || '';
  private readonly accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  private readonly model = '@cf/meta/llama-3.1-8b-instruct';

  async explainVulnerability(vuln: VulnContext): Promise<{
    explanation: string;
    codeFix: string | null;
  }> {
    if (!this.apiToken || !this.accountId) {
      return {
        explanation: vuln.description,
        codeFix: null,
      };
    }

    try {
      const prompt = `Você é um especialista em segurança web. Responda APENAS com JSON válido, sem markdown, sem texto extra.

Vulnerabilidade: ${vuln.title}
Severidade: ${vuln.severity}
Descrição técnica: ${vuln.description}

Responda em JSON com os campos:
- "explanation": explicação clara e objetiva (2-3 frases, em português brasileiro)
- "codeFix": exemplo de código de correção (string com código, ou null se não aplicável)

JSON:`;

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
              { role: 'system', content: 'Você é um especialista em segurança web. Responda sempre em JSON válido.' },
              { role: 'user', content: prompt },
            ],
            max_tokens: 500,
            temperature: 0.3,
          }),
        },
      );

      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(`Cloudflare AI API error: ${response.status}`);
        return { explanation: vuln.description, codeFix: null };
      }

      const data = await response.json();
      const text = data.result?.response || '';

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('Cloudflare AI: could not parse JSON from response');
        return { explanation: vuln.description, codeFix: null };
      }

      const content = JSON.parse(jsonMatch[0]);

      return {
        explanation: content.explanation || vuln.description,
        codeFix: content.codeFix || null,
      };
    } catch (err) {
      this.logger.error(`AI explain error: ${err}`);
      return { explanation: vuln.description, codeFix: null };
    }
  }
}
