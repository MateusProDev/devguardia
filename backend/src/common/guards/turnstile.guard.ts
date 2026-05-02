import { CanActivate, ExecutionContext, Injectable, BadRequestException, Logger } from '@nestjs/common';

@Injectable()
export class TurnstileGuard implements CanActivate {
  private readonly logger = new Logger(TurnstileGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      this.logger.warn('TURNSTILE_SECRET_KEY not configured, skipping validation');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-turnstile-token'] || request.body?.turnstileToken;

    if (!token) {
      throw new BadRequestException('Verificação de segurança necessária');
    }

    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.ip;

    try {
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          response: token,
          remoteip: ip,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        this.logger.warn(`Turnstile verification failed: ${JSON.stringify(data['error-codes'])}`);
        throw new BadRequestException('Falha na verificação de segurança. Tente novamente.');
      }

      return true;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Turnstile API error: ${error}`);
      return true;
    }
  }
}
