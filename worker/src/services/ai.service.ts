interface VulnContext {
  title: string;
  severity: string;
  description: string;
}

export class AiWorkerService {
  private readonly apiToken = process.env.CLOUDFLARE_AI_TOKEN || '';
  private readonly accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  private readonly model = '@cf/meta/llama-3.1-8b-instruct';

  async explain(vuln: VulnContext): Promise<{ explanation: string | null; codeFix: string | null }> {
    if (!this.apiToken || !this.accountId) {
      console.warn('[AI] Missing CLOUDFLARE_AI_TOKEN or CLOUDFLARE_ACCOUNT_ID — skipping AI enrichment');
      return { explanation: null, codeFix: null };
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
        console.warn(`[AI] Cloudflare API error: ${response.status} ${response.statusText}`);
        return { explanation: null, codeFix: null };
      }

      const data = await response.json();
      const text = data.result?.response || '';

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(`[AI] Could not parse JSON from response: ${text.substring(0, 200)}`);
        return { explanation: null, codeFix: null };
      }

      const content = JSON.parse(jsonMatch[0]);

      const explanation = content.explanation && content.explanation !== vuln.description
        ? content.explanation
        : null;

      return {
        explanation,
        codeFix: content.codeFix || null,
      };
    } catch (err) {
      console.warn(`[AI] Error enriching "${vuln.title}": ${err}`);
      return { explanation: null, codeFix: null };
    }
  }
}
