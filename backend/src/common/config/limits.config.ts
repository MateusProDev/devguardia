// Configurações centralizadas de limites e preços
export const LIMITS = {
  // Limites de scans gratuitos
  FREE_DAILY_SCAN_LIMIT: 1,
  FREE_VULNERABILITY_LIMIT: 2,
  
  // Limites de tempo
  SCAN_EXPIRY_MINUTES: 5, // Aumentado para 5 minutos
  AI_TIMEOUT_MS: 30000,
  HTTP_TIMEOUT_MS: 15000,
  HTTP_REDIRECT_TIMEOUT_MS: 5000,
  SENSITIVE_ENDPOINT_TIMEOUT_MS: 5000,
  MERCADOPAGO_TIMEOUT_MS: 30000,
  MERCADOPAGO_STATUS_TIMEOUT_MS: 10000,
  MERCADOPAGO_INSTALLMENTS_TIMEOUT_MS: 15000,
  DNS_LOOKUP_TIMEOUT_MS: 5000,
  NMAP_TIMEOUT_MS: 20000,
  
  // Limites de cache
  AUTH_CACHE_TTL_SECONDS: 60,
  
  // Limites de rate limiting
  WEBHOOK_RATE_LIMIT_TTL_MS: 60000,
  WEBHOOK_RATE_LIMIT_MAX: 100,
  SCAN_RATE_LIMIT_TTL_MS: 60000,
  SCAN_RATE_LIMIT_MAX: 3,
  
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
  SCAN_DEDUP_WINDOW_MS: 60000, // 1 minuto para deduplicação
  
  // Limites de segurança
  MAX_URL_LENGTH: 2048,
  MAX_CONCURRENT_SCANS_PER_USER: 2,
} as const;

export const PRICING = {
  // Preços em centavos de BRL
  SINGLE_SCAN_PRICE: 990, // R$ 9,90
  STARTER_PRICE: 3990, // R$ 39,90 /mês
  PRO_PRICE: 9990, // R$ 99,90 /mês
  ENTERPRISE_PRICE: 0, // Personalizado — definido por contato
  
  // Duração da assinatura em dias
  SUBSCRIPTION_DURATION_DAYS: 30,
} as const;

// Limites por plano
export const PLAN_LIMITS = {
  FREE: {
    dailyScans: 1,
    monthlyScans: 5,
    visibleVulns: 2,
    intensity: 'BASIC' as const,
    nmapPorts: '21,22,80,443,8080,8443',
    nmapTimeout: 15000,
    aiExplanations: false,
    historyDays: 7,
    concurrentScans: 1,
    priorityQueue: false,
  },
  STARTER: {
    dailyScans: 5,
    monthlyScans: 50,
    visibleVulns: Infinity,
    intensity: 'BASIC' as const,
    nmapPorts: '21,22,80,443,3306,5432,6379,8080,8443,27017',
    nmapTimeout: 20000,
    aiExplanations: true,
    historyDays: 30,
    concurrentScans: 2,
    priorityQueue: false,
  },
  PRO: {
    dailyScans: 30,
    monthlyScans: 300,
    visibleVulns: Infinity,
    intensity: 'AGGRESSIVE' as const,
    nmapPorts: '1-1024,3306,5432,6379,8080,8443,9200,27017,11211',
    nmapTimeout: 45000,
    aiExplanations: true,
    historyDays: 90,
    concurrentScans: 5,
    priorityQueue: true,
  },
  ENTERPRISE: {
    dailyScans: 100,
    monthlyScans: 1000,
    visibleVulns: Infinity,
    intensity: 'AGGRESSIVE' as const,
    nmapPorts: '1-65535',
    nmapTimeout: 120000,
    aiExplanations: true,
    historyDays: 365,
    concurrentScans: 10,
    priorityQueue: true,
  },
  SINGLE_SCAN: {
    visibleVulns: Infinity,
    intensity: 'BASIC' as const,
    nmapPorts: '21,22,80,443,3306,5432,6379,8080,8443,27017',
    nmapTimeout: 20000,
    aiExplanations: true,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

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
