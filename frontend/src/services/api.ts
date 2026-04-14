import { getIdToken } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function authFetch(path: string, options: RequestInit = {}) {
  const token = await getIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const res = await fetch(`${BASE_URL}/api${path}`, { ...options, headers, signal: controller.signal });
  clearTimeout(timeout);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  createScan: (url: string, acceptedTerms: boolean) =>
    authFetch('/scan', { method: 'POST', body: JSON.stringify({ url, acceptedTerms }) }),

  getConsentText: () => authFetch('/scan/consent-text'),

  getScan: (id: string) => authFetch(`/scan/${id}`),

  listScans: () => authFetch('/scan'),

  getReport: (scanId: string) => authFetch(`/report/${scanId}`),

  getSubscription: () => authFetch('/user/subscription'),

  getPaymentPublicKey: () => authFetch('/payment/public-key'),

  processPayment: (data: {
    type: 'SINGLE_SCAN' | 'SUBSCRIPTION';
    scanId?: string;
    token: string;
    paymentMethodId: string;
    email: string;
    installments: number;
    issuerId?: string;
  }) =>
    authFetch('/payment/process', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getInstallments: (amount: number, bin: string) =>
    authFetch(`/payment/installments?amount=${amount}&bin=${bin}`),
};
