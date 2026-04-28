// Configurações centralizadas de limites e preços
export const LIMITS = {
  // Limites de scans gratuitos
  FREE_DAILY_SCAN_LIMIT: 1,
  FREE_VULNERABILITY_LIMIT: 2,
  
  // Limites de tempo
  SCAN_EXPIRY_MINUTES: 2,
  AI_TIMEOUT_MS: 30000,
  HTTP_TIMEOUT_MS: 15000,
  HTTP_REDIRECT_TIMEOUT_MS: 5000,
  SENSITIVE_ENDPOINT_TIMEOUT_MS: 5000,
  MERCADOPAGO_TIMEOUT_MS: 30000,
  MERCADOPAGO_STATUS_TIMEOUT_MS: 10000,
  MERCADOPAGO_INSTALLMENTS_TIMEOUT_MS: 15000,
  DNS_LOOKUP_TIMEOUT_MS: 5000,
  
  // Limites de cache
  AUTH_CACHE_TTL_SECONDS: 60,
  
  // Limites de rate limiting
  WEBHOOK_RATE_LIMIT_TTL_MS: 60000,
  WEBHOOK_RATE_LIMIT_MAX: 100,
  
  // Limites de fila
  WORKER_CONCURRENCY: 2,
  WORKER_STALLED_INTERVAL_MS: 30000,
  WORKER_LOCK_DURATION_MS: 120000,
  WORKER_JOB_ATTEMPTS: 3,
  WORKER_JOB_BACKOFF_DELAY_MS: 2000,
  WORKER_REMOVE_COMPLETED_COUNT: 1000,
  WORKER_REMOVE_COMPLETED_AGE_SECONDS: 3600,
  WORKER_REMOVE_FAILED_COUNT: 5000,
  WORKER_REMOVE_FAILED_AGE_SECONDS: 86400,
  
  // Limites de retenção de dados
  PAGEVIEW_RETENTION_DAYS: 90,
} as const;

export const PRICING = {
  // Preços em centavos de BRL
  SINGLE_SCAN_PRICE: 990, // R$ 9,90
  SUBSCRIPTION_PRICE: 3990, // R$ 39,90
  
  // Duração da assinatura em dias
  SUBSCRIPTION_DURATION_DAYS: 30,
} as const;

// Funções auxiliares para obter valores com fallback para env vars
export function getPricing(key: keyof typeof PRICING): number {
  const envKey = key.toUpperCase();
  const envValue = process.env[envKey];
  if (envValue) {
    return parseInt(envValue, 10);
  }
  return PRICING[key];
}

export function getLimit(key: keyof typeof LIMITS): number {
  const envKey = key.toUpperCase();
  const envValue = process.env[envKey];
  if (envValue) {
    return parseInt(envValue, 10);
  }
  return LIMITS[key];
}
