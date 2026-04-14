'use client';

import { useState } from 'react';
import { X, CreditCard, Zap, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  scanId: string;
  onClose: () => void;
}

export default function UpgradeModal({ scanId, onClose }: Props) {
  const [loading, setLoading] = useState<'scan' | 'sub' | null>(null);
  const [error, setError] = useState('');

  async function handlePurchase(type: 'SINGLE_SCAN' | 'SUBSCRIPTION') {
    setError('');
    setLoading(type === 'SINGLE_SCAN' ? 'scan' : 'sub');
    try {
      const result = await api.createCheckout(type, type === 'SINGLE_SCAN' ? scanId : undefined);
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar pagamento.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-800">
          <h2 className="text-lg sm:text-xl font-bold">Desbloquear Relatório Completo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Single scan option */}
          <div className="border border-gray-700 hover:border-blue-600 rounded-xl p-5 cursor-pointer transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-950 border border-blue-800 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold">Scan Avulso</p>
                  <p className="text-gray-400 text-sm">Acesso completo para este scan</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-white">R$9,90</span>
            </div>
            <ul className="space-y-1.5 mb-4">
              {['Todas as vulnerabilidades', 'Soluções detalhadas', 'Explicações com IA', 'Código de correção'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handlePurchase('SINGLE_SCAN')}
              disabled={loading !== null}
              className="btn-primary w-full text-sm py-3 flex items-center justify-center gap-2"
            >
              {loading === 'scan' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
              ) : (
                <><CreditCard className="w-4 h-4" /> Pagar R$9,90</>
              )}
            </button>
          </div>

          {/* Subscription option */}
          <div className="border border-blue-600 rounded-xl p-5 ring-1 ring-blue-600 bg-blue-950/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">
                MELHOR VALOR
              </span>
            </div>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-950 border border-blue-700 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold">Assinatura Mensal</p>
                  <p className="text-gray-400 text-sm">Scans ilimitados por 30 dias</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-white">R$19,90</span>
            </div>
            <ul className="space-y-1.5 mb-4">
              {[
                'Tudo do Scan Avulso',
                'Scans ilimitados',
                'Acesso a todos os relatórios',
                'Novos checks automáticos',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handlePurchase('SUBSCRIPTION')}
              disabled={loading !== null}
              className="btn-primary w-full text-sm py-3 flex items-center justify-center gap-2"
            >
              {loading === 'sub' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
              ) : (
                <><Zap className="w-4 h-4" /> Assinar por R$19,90/mês</>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-gray-500">
            Pagamento seguro via Mercado Pago. Cancele quando quiser.
          </p>
        </div>
      </div>
    </div>
  );
}
