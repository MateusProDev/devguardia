import pino from 'pino';

// Padrões para sanitizar dados sensíveis dos logs
const SENSITIVE_PATTERNS = [
  { pattern: /password["\s:=]+[^\s"'`<>]{4,}/gi, replacement: 'password=***REDACTED***' },
  { pattern: /token["\s:=]+[^\s"'`<>]{20,}/gi, replacement: 'token=***REDACTED***' },
  { pattern: /secret["\s:=]+[^\s"'`<>]{10,}/gi, replacement: 'secret=***REDACTED***' },
  { pattern: /api[_-]?key["\s:=]+[^\s"'`<>]{20,}/gi, replacement: 'api_key=***REDACTED***' },
  { pattern: /private[_-]?key["\s:=]+[^\s"'`<>]{20,}/gi, replacement: 'private_key=***REDACTED***' },
  { pattern: /bearer\s+[a-zA-Z0-9._-]{20,}/gi, replacement: 'Bearer ***REDACTED***' },
  { pattern: /sk_[a-zA-Z0-9]{20,}/g, replacement: 'sk_***REDACTED***' },
  { pattern: /firebase[_-]?private[_-]?key["\s:=]+[^\s"'`<>]{10,}/gi, replacement: 'firebase_private_key=***REDACTED***' },
  { pattern: /authorization["\s:=]+[^\s"'`<>]{10,}/gi, replacement: 'authorization=***REDACTED***' },
  // Sanitizar URLs que possam conter credenciais
  { pattern: /https?:\/\/[^\s"'`<>]*:[^\s"'`<>]*@/gi, replacement: 'https://***REDACTED***@' },
  // Sanitizar CPF (11 dígitos)
  { pattern: /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, replacement: '***.***.***-**' },
  // Sanitizar emails (opcional - descomente se necessário)
  // { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '***@***.***' },
];

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  } : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export class Logger {
  private readonly context: string;
  private readonly isProduction: boolean;

  constructor(context: string) {
    this.context = context;
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private sanitize(message: any): any {
    if (typeof message === 'string') {
      let sanitized = message;
      for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
        sanitized = sanitized.replace(pattern, replacement);
      }
      return sanitized;
    }

    if (typeof message === 'object' && message !== null) {
      const str = JSON.stringify(message);
      const sanitized = this.sanitize(str);
      try {
        return JSON.parse(sanitized);
      } catch {
        return sanitized;
      }
    }

    return message;
  }

  log(message: any, context?: string) {
    const sanitized = this.isProduction ? this.sanitize(message) : message;
    pinoLogger.info({ context: context || this.context }, sanitized);
  }

  error(message: any, trace?: string, context?: string) {
    const sanitized = this.isProduction ? this.sanitize(message) : message;
    pinoLogger.error({ context: context || this.context, trace }, sanitized);
  }

  warn(message: any, context?: string) {
    const sanitized = this.isProduction ? this.sanitize(message) : message;
    pinoLogger.warn({ context: context || this.context }, sanitized);
  }

  debug(message: any, context?: string) {
    if (!this.isProduction) {
      pinoLogger.debug({ context: context || this.context }, message);
    }
  }

  verbose(message: any, context?: string) {
    if (!this.isProduction) {
      pinoLogger.trace({ context: context || this.context }, message);
    }
  }
}
