'use client';

import { useState } from 'react';
import { X, Copy, Check, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { marketplaceApi, Product, Purchase, piconeroToXmr, centsToBrl, PaymentMethod } from '../../services/marketplace';

interface Props {
  product: Product;
  onClose: () => void;
  onPurchaseCreated?: (purchase: Purchase) => void;
}

export function CheckoutModal({ product, onClose, onPurchaseCreated }: Props) {
  const [step, setStep] = useState<'choose' | 'instructions' | 'claim' | 'done'>('choose');
  const [method, setMethod] = useState<PaymentMethod>('XMR');
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [txRef, setTxRef] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  async function handleCreatePurchase() {
    setLoading(true);
    setError('');
    try {
      const p = await marketplaceApi.createPurchase({ productId: product.id, paymentMethod: method });
      setPurchase(p);
      onPurchaseCreated?.(p);
      setStep('instructions');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim() {
    if (!purchase) return;
    setLoading(true);
    setError('');
    try {
      await marketplaceApi.claimPayment(purchase.id, { txReference: txRef || undefined, proofUrl: proofUrl || undefined });
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const instr = purchase?.paymentInstructions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-black border border-green-500/30 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-green-500/20">
          <div className="flex items-center gap-2 text-xs font-mono text-green-400">
            <span className="w-2 h-2 bg-green-500 animate-pulse" />
            CHECKOUT
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-red-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Product info */}
          <div className="border border-green-500/10 p-4 bg-green-500/5">
            <p className="text-xs font-mono text-green-500/60 mb-1">[PRODUTO]</p>
            <p className="font-mono font-semibold text-sm">{product.title}</p>
          </div>

          {/* Step: choose method */}
          {step === 'choose' && (
            <div className="space-y-4">
              <p className="text-xs font-mono text-gray-500">// Selecione o método de pagamento</p>
              <div className="grid grid-cols-2 gap-3">
                {product.acceptsXmr && product.priceXmrPiconero && (
                  <button
                    onClick={() => setMethod('XMR')}
                    className={`p-4 border font-mono text-sm transition-all text-left ${
                      method === 'XMR'
                        ? 'border-orange-500/60 bg-orange-500/10 text-orange-400'
                        : 'border-gray-800 text-gray-500 hover:border-orange-500/30'
                    }`}
                  >
                    <div className="text-lg mb-1">ɱ</div>
                    <div className="font-semibold">MONERO</div>
                    <div className="text-xs mt-1 opacity-70">{piconeroToXmr(product.priceXmrPiconero)} XMR</div>
                  </button>
                )}
                {product.acceptsPix && product.pricePixBrlCents && (
                  <button
                    onClick={() => setMethod('PIX')}
                    className={`p-4 border font-mono text-sm transition-all text-left ${
                      method === 'PIX'
                        ? 'border-blue-500/60 bg-blue-500/10 text-blue-400'
                        : 'border-gray-800 text-gray-500 hover:border-blue-500/30'
                    }`}
                  >
                    <div className="text-lg mb-1">₿</div>
                    <div className="font-semibold">PIX</div>
                    <div className="text-xs mt-1 opacity-70">{centsToBrl(product.pricePixBrlCents)}</div>
                  </button>
                )}
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-mono">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              <button
                onClick={handleCreatePurchase}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                INICIAR_COMPRA →
              </button>
            </div>
          )}

          {/* Step: instructions */}
          {step === 'instructions' && instr && (
            <div className="space-y-4">
              <p className="text-xs font-mono text-gray-500">// Envie o pagamento para o vendedor</p>

              {instr.method === 'XMR' && (
                <div className="space-y-3">
                  <div className="border border-orange-500/20 p-3 bg-orange-500/5">
                    <p className="text-xs font-mono text-orange-500/60 mb-1">[ENDEREÇO_MONERO]</p>
                    <p className="font-mono text-xs text-gray-300 break-all">{instr.moneroAddress}</p>
                    <button
                      onClick={() => copyToClipboard(instr.moneroAddress)}
                      className="mt-2 flex items-center gap-1 text-xs font-mono text-orange-400 hover:text-orange-300"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'COPIADO' : 'COPIAR'}
                    </button>
                  </div>
                  <div className="border border-orange-500/20 p-3 bg-orange-500/5">
                    <p className="text-xs font-mono text-orange-500/60 mb-1">[VALOR]</p>
                    <p className="font-mono text-lg text-orange-400">ɱ {instr.amountXmr} XMR</p>
                    <p className="text-xs font-mono text-gray-600 mt-1">({instr.amountPiconero} piconero)</p>
                  </div>
                  <p className="text-xs font-mono text-gray-600 border border-gray-800 p-3">{instr.note}</p>
                </div>
              )}

              {instr.method === 'PIX' && (
                <div className="space-y-3">
                  <div className="border border-blue-500/20 p-3 bg-blue-500/5">
                    <p className="text-xs font-mono text-blue-500/60 mb-1">[CHAVE_PIX]</p>
                    <p className="font-mono text-xs text-gray-300">{instr.pixKey} ({instr.pixKeyType})</p>
                    <button
                      onClick={() => copyToClipboard(instr.pixKey)}
                      className="mt-2 flex items-center gap-1 text-xs font-mono text-blue-400 hover:text-blue-300"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'COPIADO' : 'COPIAR'}
                    </button>
                  </div>
                  {instr.pixHolderName && (
                    <div className="border border-blue-500/20 p-3 bg-blue-500/5">
                      <p className="text-xs font-mono text-blue-500/60 mb-1">[FAVORECIDO]</p>
                      <p className="font-mono text-sm text-gray-300">{instr.pixHolderName}</p>
                    </div>
                  )}
                  <div className="border border-blue-500/20 p-3 bg-blue-500/5">
                    <p className="text-xs font-mono text-blue-500/60 mb-1">[VALOR]</p>
                    <p className="font-mono text-lg text-blue-400">{centsToBrl(instr.amountBrlCents)}</p>
                  </div>
                  <p className="text-xs font-mono text-gray-600 border border-gray-800 p-3">{instr.note}</p>
                </div>
              )}

              <button
                onClick={() => setStep('claim')}
                className="btn-primary w-full"
              >
                JÁ_ENVIEI_O_PAGAMENTO →
              </button>
            </div>
          )}

          {/* Step: claim */}
          {step === 'claim' && (
            <div className="space-y-4">
              <p className="text-xs font-mono text-gray-500">// Informe o comprovante (opcional mas recomendado)</p>
              <div>
                <label className="text-xs font-mono text-gray-600 mb-1 block">ID_DA_TRANSAÇÃO / TX_HASH</label>
                <input
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  placeholder="opcional"
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-gray-600 mb-1 block">URL_COMPROVANTE</label>
                <input
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://... (opcional)"
                  className="input-field text-sm"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-mono">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              <button
                onClick={handleClaim}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                ENVIAR_COMPROVANTE →
              </button>
            </div>
          )}

          {/* Step: done */}
          {step === 'done' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="font-mono text-green-400 font-semibold mb-2">PAGAMENTO_NOTIFICADO</p>
                <p className="text-xs font-mono text-gray-600">
                  // O vendedor confirmará em breve.<br />
                  // Você receberá acesso após a confirmação.
                </p>
              </div>
              <button onClick={onClose} className="btn-outline w-full">
                [FECHAR]
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
