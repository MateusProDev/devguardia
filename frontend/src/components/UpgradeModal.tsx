'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  CreditCard,
  Zap,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Lock,
  AlertCircle,
  Copy,
  QrCode,
  Clock,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface Props {
  scanId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'choose-plan' | 'choose-method' | 'card' | 'pix';

const SINGLE_PRICE = 990;
const SUB_PRICE = 1990;

export default function UpgradeModal({ scanId, onClose, onSuccess }: Props) {
  const hasScanId = Boolean(scanId);
  const [step, setStep] = useState<Step>(hasScanId ? 'choose-plan' : 'choose-method');
  const [selectedType, setSelectedType] = useState<'SINGLE_SCAN' | 'SUBSCRIPTION' | null>(hasScanId ? null : 'SUBSCRIPTION');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [email, setEmail] = useState('');
  const [installments, setInstallments] = useState(1);
  const [installmentOptions, setInstallmentOptions] = useState<any[]>([]);
  const [cardBrand, setCardBrand] = useState('');

  // PIX state
  const [cpf, setCpf] = useState('');
  const [pixQrCode, setPixQrCode] = useState('');
  const [pixCopied, setPixCopied] = useState(false);
  const pixPollRef = useRef<NodeJS.Timeout | null>(null);

  const mpRef = useRef<any>(null);
  const sdkLoaded = useRef(false);

  // Load MercadoPago SDK
  useEffect(() => {
    if (sdkLoaded.current) return;

    async function loadSdk() {
      try {
        const { publicKey } = await api.getPaymentPublicKey();

        if (window.MercadoPago) {
          mpRef.current = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
          sdkLoaded.current = true;
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        script.onload = () => {
          mpRef.current = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
          sdkLoaded.current = true;
        };
        document.head.appendChild(script);
      } catch {
        setError('Erro ao carregar sistema de pagamento.');
      }
    }

    loadSdk();
  }, []);

  // Cleanup PIX polling on unmount
  useEffect(() => {
    return () => {
      if (pixPollRef.current) clearInterval(pixPollRef.current);
    };
  }, []);

  function selectPlan(type: 'SINGLE_SCAN' | 'SUBSCRIPTION') {
    setSelectedType(type);
    setStep('choose-method');
    setError('');
  }

  function goBack() {
    if (step === 'choose-method') {
      if (hasScanId) {
        setStep('choose-plan');
      }
    } else if (step === 'card' || step === 'pix') {
      if (pixPollRef.current) clearInterval(pixPollRef.current);
      setPixQrCode('');
      setStep('choose-method');
    }
    setError('');
  }

  // --- Card helpers ---
  function formatCardNumber(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  function formatExpiry(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  }

  function formatCpf(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length > 9) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4');
    if (digits.length > 6) return digits.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
    if (digits.length > 3) return digits.replace(/(\d{3})(\d+)/, '$1.$2');
    return digits;
  }

  const fetchInstallments = useCallback(
    async (bin: string) => {
      if (bin.length < 6 || !selectedType) return;
      try {
        const amount = selectedType === 'SINGLE_SCAN' ? SINGLE_PRICE : SUB_PRICE;
        const result = await api.getInstallments(amount, bin);
        if (result?.[0]) {
          setCardBrand(result[0].payment_method_id || '');
          setInstallmentOptions(result[0].payer_costs || []);
        }
      } catch {
        // silently fail
      }
    },
    [selectedType],
  );

  useEffect(() => {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length >= 6) {
      fetchInstallments(digits.slice(0, 6));
    } else {
      setInstallmentOptions([]);
      setCardBrand('');
    }
  }, [cardNumber, fetchInstallments]);

  // --- Card submit ---
  async function handleCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mpRef.current || !selectedType) return;

    setError('');
    setLoading(true);

    try {
      const digits = cardNumber.replace(/\D/g, '');
      const [expMonth, expYear] = expiry.split('/');

      const cardTokenResult = await mpRef.current.createCardToken({
        cardNumber: digits,
        cardholderName: cardName,
        cardExpirationMonth: expMonth,
        cardExpirationYear: `20${expYear}`,
        securityCode: cvv,
      });

      if (cardTokenResult.error) {
        throw new Error(cardTokenResult.error);
      }

      const result = await api.processPayment({
        type: selectedType,
        scanId: selectedType === 'SINGLE_SCAN' ? scanId : undefined,
        token: cardTokenResult.id,
        paymentMethodId: cardBrand || 'visa',
        email,
        installments,
        issuerId: undefined,
      });

      if (result.status === 'APPROVED') {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
          window.location.reload();
        }, 2000);
      } else if (result.status === 'PENDING') {
        setError('Pagamento em análise. Você será notificado quando for aprovado.');
      } else {
        setError('Pagamento recusado. Verifique os dados e tente novamente.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar pagamento.');
    } finally {
      setLoading(false);
    }
  }

  // --- PIX ---
  async function handlePixGenerate() {
    const cpfDigits = cpf.replace(/\D/g, '');
    if (!selectedType || !email || cpfDigits.length !== 11) return;

    setError('');
    setLoading(true);

    try {
      const result = await api.processPixPayment({
        type: selectedType,
        scanId: selectedType === 'SINGLE_SCAN' ? scanId : undefined,
        email,
        cpf: cpfDigits,
      });

      if (result.qrCode) {
        setPixQrCode(result.qrCode);
        startPixPolling(result.paymentId);
      } else {
        throw new Error('QR Code não gerado.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar PIX.');
    } finally {
      setLoading(false);
    }
  }

  function startPixPolling(paymentId: string) {
    if (pixPollRef.current) clearInterval(pixPollRef.current);

    let attempts = 0;
    pixPollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 120) {
        if (pixPollRef.current) clearInterval(pixPollRef.current);
        return;
      }

      try {
        const { status } = await api.checkPaymentStatus(paymentId);
        if (status === 'APPROVED') {
          if (pixPollRef.current) clearInterval(pixPollRef.current);
          setSuccess(true);
          setTimeout(() => {
            onSuccess?.();
            onClose();
            window.location.reload();
          }, 2000);
        } else if (status === 'REJECTED') {
          if (pixPollRef.current) clearInterval(pixPollRef.current);
          setError('Pagamento PIX expirado ou recusado.');
          setPixQrCode('');
        }
      } catch {
        // will retry
      }
    }, 5000);
  }

  async function copyPixCode() {
    try {
      await navigator.clipboard.writeText(pixQrCode);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = pixQrCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2000);
    }
  }

  const priceLabel = selectedType === 'SINGLE_SCAN' ? '9,90' : '19,90';
  const planLabel = selectedType === 'SINGLE_SCAN' ? 'Scan Avulso' : 'Assinatura Mensal';

  const stepTitle: Record<Step, string> = {
    'choose-plan': 'Desbloquear Relatório Completo',
    'choose-method': 'Forma de Pagamento',
    card: 'Pagamento com Cartão',
    pix: 'Pagamento via PIX',
  };

  // --- Success screen ---
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-950 border border-green-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Pagamento Aprovado!</h2>
          <p className="text-gray-400">Seu relatório completo será liberado em instantes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            {step !== 'choose-plan' && (
              <button onClick={goBack} className="text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg sm:text-xl font-bold">{stepTitle[step]}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {error && (
            <div className="p-3 mb-4 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ===== STEP 1: Choose Plan ===== */}
          {step === 'choose-plan' && (
            <div className="space-y-4">
              <button
                onClick={() => selectPlan('SINGLE_SCAN')}
                className="w-full text-left border border-gray-700 hover:border-blue-600 rounded-xl p-5 transition-all"
              >
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
                <ul className="space-y-1.5">
                  {['Todas as vulnerabilidades', 'Soluções detalhadas', 'Explicações com IA', 'Código de correção'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>

              <button
                onClick={() => selectPlan('SUBSCRIPTION')}
                className="w-full text-left border border-blue-600 rounded-xl p-5 ring-1 ring-blue-600 bg-blue-950/20 transition-all"
              >
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
                <ul className="space-y-1.5">
                  {['Tudo do Scan Avulso', 'Scans ilimitados', 'Acesso a todos os relatórios', 'Novos checks automáticos'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>

              <p className="text-center text-xs text-gray-500">
                Pagamento seguro processado via Mercado Pago.
              </p>
            </div>
          )}

          {/* ===== STEP 2: Choose Payment Method ===== */}
          {step === 'choose-method' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg text-sm">
                <span className="text-gray-300">{planLabel}</span>
                <span className="font-bold text-white">R${priceLabel}</span>
              </div>

              <button
                onClick={() => setStep('card')}
                className="w-full flex items-center gap-4 border border-gray-700 hover:border-blue-600 rounded-xl p-4 transition-all text-left"
              >
                <div className="w-12 h-12 bg-blue-950 border border-blue-800 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Cartão de Crédito</p>
                  <p className="text-gray-400 text-sm">Visa, Mastercard, Elo, Amex...</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-500 rotate-180" />
              </button>

              <button
                onClick={() => setStep('pix')}
                className="w-full flex items-center gap-4 border border-gray-700 hover:border-green-600 rounded-xl p-4 transition-all text-left"
              >
                <div className="w-12 h-12 bg-green-950 border border-green-800 rounded-xl flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">PIX</p>
                  <p className="text-gray-400 text-sm">Aprovação instantânea</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-500 rotate-180" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                <Lock className="w-3 h-3" />
                Pagamento seguro e criptografado
              </div>
            </div>
          )}

          {/* ===== STEP 3A: Card Form ===== */}
          {step === 'card' && (
            <form onSubmit={handleCardSubmit} className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg text-sm">
                <span className="text-gray-300">{planLabel}</span>
                <span className="font-bold text-white">R${priceLabel}</span>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">E-mail do pagador</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Número do cartão</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    className="input-field pr-12"
                  />
                  {cardBrand && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 uppercase font-semibold">
                      {cardBrand}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Nome no cartão</label>
                <input
                  type="text"
                  required
                  autoComplete="cc-name"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  placeholder="NOME COMO ESTÁ NO CARTÃO"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Validade</label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/AA"
                    maxLength={5}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">CVV</label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    maxLength={4}
                    className="input-field"
                  />
                </div>
              </div>

              {installmentOptions.length > 1 && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Parcelas</label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="input-field"
                  >
                    {installmentOptions.map((opt: any) => (
                      <option key={opt.installments} value={opt.installments}>
                        {opt.installments}x de R${(opt.installment_amount).toFixed(2).replace('.', ',')}
                        {opt.installments > 1 ? ` (Total: R$${(opt.total_amount).toFixed(2).replace('.', ',')})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm font-semibold"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                ) : (
                  <><Lock className="w-4 h-4" /> Pagar R${priceLabel}</>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                <Lock className="w-3 h-3" />
                Pagamento seguro e criptografado
              </div>
            </form>
          )}

          {/* ===== STEP 3B: PIX ===== */}
          {step === 'pix' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg text-sm">
                <span className="text-gray-300">{planLabel}</span>
                <span className="font-bold text-white">R${priceLabel}</span>
              </div>

              {!pixQrCode ? (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">E-mail do pagador</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">CPF do pagador</label>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      value={cpf}
                      onChange={(e) => setCpf(formatCpf(e.target.value))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="input-field"
                    />
                  </div>

                  <button
                    onClick={handlePixGenerate}
                    disabled={loading || !email || cpf.replace(/\D/g, '').length !== 11}
                    className="w-full py-3.5 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl transition-all duration-200 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Gerando PIX...</>
                    ) : (
                      <><QrCode className="w-4 h-4" /> Gerar QR Code PIX</>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* QR Code */}
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-4 rounded-2xl mb-4">
                      <QRCodeSVG
                        value={pixQrCode}
                        size={200}
                        level="M"
                        includeMargin={false}
                      />
                    </div>

                    <div className="flex items-center gap-2 text-sm text-green-400 mb-2">
                      <Clock className="w-4 h-4 animate-pulse" />
                      Aguardando pagamento...
                    </div>
                  </div>

                  {/* Copia e Cola */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Código PIX Copia e Cola</label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={pixQrCode}
                        className="input-field pr-12 text-xs"
                      />
                      <button
                        onClick={copyPixCode}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                        title="Copiar código"
                      >
                        {pixCopied ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {pixCopied && (
                      <p className="text-xs text-green-400 mt-1">Código copiado!</p>
                    )}
                  </div>

                  {/* Instructions */}
                  <div className="bg-gray-800 rounded-xl p-4 space-y-2">
                    <p className="text-sm font-semibold text-gray-200">Como pagar:</p>
                    <ol className="text-sm text-gray-400 space-y-1.5 list-decimal list-inside">
                      <li>Abra o app do seu banco</li>
                      <li>Escolha pagar via PIX</li>
                      <li>Escaneie o QR Code ou cole o código</li>
                      <li>Confirme o pagamento</li>
                    </ol>
                    <p className="text-xs text-gray-500 pt-1">
                      O pagamento será confirmado automaticamente em segundos.
                    </p>
                  </div>
                </>
              )}

              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                <Lock className="w-3 h-3" />
                Pagamento seguro via Mercado Pago
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
