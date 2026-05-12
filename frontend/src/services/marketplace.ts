import { getIdToken } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function authFetch(path: string, options: RequestInit = {}) {
  const token = await getIdToken();
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/api${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

async function publicFetch(path: string) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export type ProductType = 'COURSE' | 'EBOOK' | 'MENTORSHIP';
export type PaymentMethod = 'XMR' | 'PIX';
export type PurchaseStatus = 'PENDING' | 'WAITING_CONFIRMATION' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
export type ContributionTier = 'TIER_10' | 'TIER_20' | 'TIER_30' | 'TIER_50';

export interface Creator {
  id: string;
  slug: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  status: string;
  acceptsXmr: boolean;
  acceptsPix: boolean;
  user?: { email: string };
}

export interface Product {
  id: string;
  slug: string;
  type: ProductType;
  title: string;
  shortDescription?: string;
  description: string;
  coverImageUrl?: string;
  priceXmrPiconero?: string;
  pricePixBrlCents?: number;
  acceptsXmr: boolean;
  acceptsPix: boolean;
  status: string;
  creator?: Creator;
  modules?: Module[];
  _count?: { modules: number; purchases: number };
  reviews?: Review[];
  avgRating?: number;
  reviewCount?: number;
}

export interface Module {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  type: 'VIDEO' | 'TEXT' | 'PDF';
  position: number;
  durationSec?: number;
  isPreview: boolean;
  content?: string;
  storageKey?: string;
}

export interface Purchase {
  id: string;
  productId: string;
  paymentMethod: PaymentMethod;
  amountXmrPiconero?: string;
  amountPixBrlCents?: number;
  status: PurchaseStatus;
  paymentInstructions?: any;
  txReference?: string;
  proofUrl?: string;
  claimedAt?: string;
  confirmedAt?: string;
  createdAt: string;
  product?: Product;
  buyer?: { email: string };
}

export interface Contribution {
  id: string;
  tier: ContributionTier;
  paymentMethod: PaymentMethod;
  status: string;
  paymentInstructions?: any;
  createdAt: string;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  buyer?: { email: string };
}

const TIER_AMOUNTS: Record<ContributionTier, number> = {
  TIER_10: 10,
  TIER_20: 20,
  TIER_30: 30,
  TIER_50: 50,
};

export { TIER_AMOUNTS };

export function piconeroToXmr(piconero: string | undefined): string {
  if (!piconero) return '0';
  return (Number(BigInt(piconero)) / 1e12).toFixed(6);
}

export function centsToBrl(cents: number | undefined): string {
  if (!cents) return 'R$ 0,00';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const marketplaceApi = {
  // ─── Public ────────────────────────────────────────────────────────────────
  listProducts: (params: { type?: string; q?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.type && params.type !== 'ALL') qs.set('type', params.type);
    if (params.q) qs.set('q', params.q);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));
    const query = qs.toString();
    return publicFetch(`/marketplace/products${query ? `?${query}` : ''}`);
  },
  getProduct: (slug: string) => publicFetch(`/marketplace/products/by-slug/${slug}`),
  getCreator: (slug: string) => publicFetch(`/marketplace/creators/${slug}`),
  getReviews: (productId: string) => publicFetch(`/marketplace/reviews/${productId}`),

  // ─── Creator Profile ────────────────────────────────────────────────────────
  getMyProfile: () => authFetch('/marketplace/creators/me'),
  upsertMyProfile: (data: { slug: string; displayName: string; bio?: string; avatarUrl?: string; acceptedTerms: boolean }) =>
    authFetch('/marketplace/creators/me', { method: 'PUT', body: JSON.stringify(data) }),
  updatePaymentConfig: (data: {
    moneroAddress?: string;
    moneroViewKey?: string;
    pixKey?: string;
    pixKeyType?: string;
    pixHolderName?: string;
    pixQrCodeUrl?: string;
  }) => authFetch('/marketplace/creators/me/payment-config', { method: 'PUT', body: JSON.stringify(data) }),

  // ─── My Products ────────────────────────────────────────────────────────────
  listMyProducts: () => authFetch('/marketplace/products/me'),
  getMyProduct: (id: string) => authFetch(`/marketplace/products/me/${id}`),
  createProduct: (data: Partial<Product>) =>
    authFetch('/marketplace/products/me', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Partial<Product>) =>
    authFetch(`/marketplace/products/me/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  publishProduct: (id: string, publish: boolean) =>
    authFetch(`/marketplace/products/me/${id}/publish`, { method: 'POST', body: JSON.stringify({ publish }) }),
  deleteProduct: (id: string) =>
    authFetch(`/marketplace/products/me/${id}`, { method: 'DELETE' }),

  // ─── Modules ────────────────────────────────────────────────────────────────
  createModule: (productId: string, data: { title: string; position: number }) =>
    authFetch(`/marketplace/products/me/${productId}/modules`, { method: 'POST', body: JSON.stringify(data) }),
  updateModule: (moduleId: string, data: { title?: string; position?: number }) =>
    authFetch(`/marketplace/products/me/modules/${moduleId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteModule: (moduleId: string) =>
    authFetch(`/marketplace/products/me/modules/${moduleId}`, { method: 'DELETE' }),

  // ─── Lessons ────────────────────────────────────────────────────────────────
  createLesson: (moduleId: string, data: { title: string; type: string; position: number; isPreview?: boolean; durationSec?: number; content?: string; storageKey?: string }) =>
    authFetch(`/marketplace/products/me/modules/${moduleId}/lessons`, { method: 'POST', body: JSON.stringify(data) }),
  updateLesson: (lessonId: string, data: { title?: string; type?: string; position?: number; isPreview?: boolean; durationSec?: number; content?: string; storageKey?: string }) =>
    authFetch(`/marketplace/products/me/lessons/${lessonId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLesson: (lessonId: string) =>
    authFetch(`/marketplace/products/me/lessons/${lessonId}`, { method: 'DELETE' }),

  // ─── Purchases ──────────────────────────────────────────────────────────────
  createPurchase: (data: { productId: string; paymentMethod: PaymentMethod }) =>
    authFetch('/marketplace/purchases', { method: 'POST', body: JSON.stringify(data) }),
  getPurchase: (id: string) => authFetch(`/marketplace/purchases/${id}`),
  listMyPurchases: () => authFetch('/marketplace/purchases/me'),
  listMySales: (status?: string) =>
    authFetch(`/marketplace/purchases/sales${status ? `?status=${status}` : ''}`),
  claimPayment: (id: string, data: { txReference?: string; proofUrl?: string; note?: string }) =>
    authFetch(`/marketplace/purchases/${id}/claim`, { method: 'POST', body: JSON.stringify(data) }),
  confirmSale: (id: string, data: { note?: string }) =>
    authFetch(`/marketplace/purchases/${id}/confirm`, { method: 'POST', body: JSON.stringify(data) }),
  cancelPurchase: (id: string) =>
    authFetch(`/marketplace/purchases/${id}/cancel`, { method: 'POST', body: '{}' }),
  checkAccess: (productId: string) => authFetch(`/marketplace/purchases/access/${productId}`),

  // ─── Contributions ──────────────────────────────────────────────────────────
  createContribution: (data: { tier: ContributionTier; paymentMethod: PaymentMethod }) =>
    authFetch('/marketplace/contributions', { method: 'POST', body: JSON.stringify(data) }),
  listMyContributions: () => authFetch('/marketplace/contributions/me'),
  claimContribution: (id: string, data: { txReference?: string; proofUrl?: string }) =>
    authFetch(`/marketplace/contributions/${id}/claim`, { method: 'POST', body: JSON.stringify(data) }),

  // ─── Reviews ────────────────────────────────────────────────────────────────
  upsertReview: (productId: string, data: { rating: number; comment?: string }) =>
    authFetch(`/marketplace/reviews/${productId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteReview: (productId: string) =>
    authFetch(`/marketplace/reviews/${productId}`, { method: 'DELETE' }),

  // ─── Upload ──────────────────────────────────────────────────────────────────
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await authFetch('/upload/image', { method: 'POST', body: formData });
    return res.url as string;
  },
};
