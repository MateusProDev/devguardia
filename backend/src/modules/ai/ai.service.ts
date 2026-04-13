import { Injectable, Logger } from '@nestjs/common';

interface VulnContext {
  title: string;
  severity: string;
  description: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey = process.env.OPENAI_API_KEY || '';
  private readonly model = 'gpt-4o-mini';

  async explainVulnerability(vuln: VulnContext): Promise<{
    explanation: string;
    codeFix: string | null;
  }> {
    if (!this.apiKey) {
      return {
        explanation: vuln.description,
        codeFix: null,
      };
    }

    try {
      const prompt = `Você é um especialista em segurança web. Explique a vulnerabilidade abaixo em linguagem simples para o desenvolvedor:

Vulnerabilidade: ${vuln.title}
Severidade: ${vuln.severity}
Descrição técnica: ${vuln.description}

Responda em JSON com os campos:
- explanation: explicação clara e objetiva (2-3 frases, em português)
- codeFix: exemplo de código de correção (string com código, ou null se não aplicável)`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' },
          max_tokens: 500,
        }),
      });
      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(`OpenAI API error: ${response.status}`);
        return { explanation: vuln.description, codeFix: null };
      }

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);

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
