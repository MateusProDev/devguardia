'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal, Scale, AlertTriangle, FileCheck, X } from 'lucide-react';

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
    handler();
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const canAccept = scrolledToBottom && checked;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-black border border-green-500/30 shadow-2xl shadow-green-500/5 overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Terminal header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-green-500/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
            <span className="text-gray-600 text-xs ml-2 font-mono">legal_consent.sh</span>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-600 hover:text-red-400 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header content */}
        <div className="px-4 sm:px-6 py-4 border-b border-green-500/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <Scale className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="font-mono">
              <h2 className="text-sm font-bold text-yellow-400">[LEGAL_CONSENT_REQUIRED]</h2>
              <p className="text-[10px] text-gray-600">// Leitura obrigatória antes de prosseguir</p>
            </div>
          </div>
        </div>

        {/* Target URL badge */}
        <div className="px-4 sm:px-6 pt-4 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 border border-green-500/20 text-xs font-mono">
            <Terminal className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            <span className="text-gray-600 hidden sm:inline">target:</span>
            <span className="text-green-400 truncate">{url}</span>
          </div>
        </div>

        {/* Legal text */}
        <div className="px-4 sm:px-6 pt-4 flex-1 min-h-0">
          <div
            ref={scrollRef}
            className="h-40 sm:h-56 overflow-y-auto border border-green-500/10 bg-black/50 p-3 sm:p-4 text-xs leading-relaxed text-gray-400 scroll-smooth custom-scrollbar font-mono"
          >
            <div className="flex items-start gap-2 mb-4 p-3 border border-yellow-500/20 bg-yellow-950/10">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-yellow-400/80 text-[11px]">
                Este documento tem validade jurídica. O consentimento será registrado com
                data, hora, IP e identificação do usuário.
              </p>
            </div>

            <p className="mb-4">{consentText}</p>

            <div className="mt-4 space-y-3 text-[11px] text-gray-500">
              <div className="flex items-start gap-2">
                <FileCheck className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                <p>
                  <strong className="text-gray-400">Base Legal:</strong> Art. 154-A do Código Penal
                  (Lei nº 12.737/2012) — Invasão de dispositivo informático;
                  Lei nº 13.709/2018 (LGPD) — Proteção de dados pessoais.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <FileCheck className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                <p>
                  <strong className="text-gray-400">Armazenamento:</strong> Este consentimento será
                  armazenado de forma segura e poderá ser apresentado às autoridades competentes
                  quando solicitado, conforme Art. 7º, inciso I da LGPD.
                </p>
              </div>
            </div>
          </div>

          {!scrolledToBottom && (
            <p className="text-center text-[10px] text-gray-600 mt-2 animate-pulse font-mono">
              [SCROLL_DOWN_TO_CONTINUE]
            </p>
          )}
        </div>

        {/* Checkbox + Actions */}
        <div className="px-4 sm:px-6 py-4 border-t border-green-500/10 mt-4 flex-shrink-0">
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
              className="mt-1 w-4 h-4 border-green-500/30 bg-black text-green-600 focus:ring-green-500 focus:ring-offset-black accent-green-500"
            />
            <span className="text-xs text-gray-400 font-mono">
              Li e concordo integralmente com os termos acima. Declaro que sou o proprietário
              ou possuo autorização para analisar o domínio informado.
            </span>
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 text-xs font-mono text-gray-600 hover:text-gray-300 border border-gray-800 hover:border-gray-600 transition-all uppercase tracking-wider"
            >
              [CANCEL]
            </button>
            <button
              onClick={onAccept}
              disabled={!canAccept || loading}
              className="flex-1 px-4 py-3 text-xs font-mono bg-green-600/20 text-green-400 border border-green-500/50 hover:bg-green-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                  PROCESSING...
                </>
              ) : (
                <>
                  <Terminal className="w-3.5 h-3.5" />
                  &lt;ACCEPT_&amp;_SCAN/&gt;
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
