'use client';

import { useEffect, useRef, useState } from 'react';
import { Shield, Scale, AlertTriangle, FileCheck, X } from 'lucide-react';

interface ScanConsentModalProps {
  url: string;
  consentText: string;
  loading: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

export default function ScanConsentModal({
  url,
  consentText,
  loading,
  onAccept,
  onCancel,
}: ScanConsentModalProps) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [checked, setChecked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
      if (atBottom) setScrolledToBottom(true);
    };
    el.addEventListener('scroll', handler);
    // Check initially if content is short enough
    handler();
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const canAccept = scrolledToBottom && checked;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-800 flex items-center justify-center">
              <Scale className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Termo de Responsabilidade</h2>
              <p className="text-xs text-gray-400">Leitura obrigatória antes de prosseguir</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target URL badge */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm">
            <Shield className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="text-gray-400">Alvo da análise:</span>
            <span className="text-white font-medium truncate">{url}</span>
          </div>
        </div>

        {/* Legal text */}
        <div className="px-6 pt-4">
          <div
            ref={scrollRef}
            className="h-56 overflow-y-auto rounded-xl border border-gray-700 bg-gray-950 p-4 text-sm leading-relaxed text-gray-300 scroll-smooth custom-scrollbar"
          >
            <div className="flex items-start gap-2 mb-4 p-3 bg-amber-950/40 border border-amber-900/50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-amber-200 text-xs">
                Este documento tem validade jurídica. O consentimento será registrado com
                data, hora, IP e identificação do usuário.
              </p>
            </div>

            <p className="mb-4">{consentText}</p>

            <div className="mt-4 space-y-3 text-xs text-gray-400">
              <div className="flex items-start gap-2">
                <FileCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p>
                  <strong className="text-gray-300">Base Legal:</strong> Art. 154-A do Código Penal
                  (Lei nº 12.737/2012) — Invasão de dispositivo informático;
                  Lei nº 13.709/2018 (LGPD) — Proteção de dados pessoais.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <FileCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p>
                  <strong className="text-gray-300">Armazenamento:</strong> Este consentimento será
                  armazenado de forma segura e poderá ser apresentado às autoridades competentes
                  quando solicitado, conforme Art. 7º, inciso I da LGPD.
                </p>
              </div>
            </div>
          </div>

          {!scrolledToBottom && (
            <p className="text-center text-xs text-gray-500 mt-2 animate-pulse">
              ↓ Role até o final para continuar ↓
            </p>
          )}
        </div>

        {/* Checkbox + Actions */}
        <div className="px-6 py-4 border-t border-gray-800 mt-4">
          <label
            className={`flex items-start gap-3 mb-4 cursor-pointer select-none ${
              !scrolledToBottom ? 'opacity-40 pointer-events-none' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              disabled={!scrolledToBottom}
              className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
            />
            <span className="text-sm text-gray-300">
              Li e concordo integralmente com os termos acima. Declaro que sou o proprietário
              ou possuo autorização para analisar o domínio informado.
            </span>
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={onAccept}
              disabled={!canAccept || loading}
              className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Aceitar e Iniciar Análise
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
