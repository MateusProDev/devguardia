import { useEffect, useRef, useState, FormEvent } from 'react';
import { sendSupportMessage, listenSupportMessages } from '../services/supportChat';
import { auth } from '../lib/firebase';
import { MessageCircle, Send, X } from 'lucide-react';

interface SupportMessage {
  id: string;
  message: string;
  from: string;
  createdAt?: any;
}

const QUICK_MESSAGES = [
  'Preciso de ajuda com meu scan',
  'Meu pagamento não foi processado',
  'Como faço upgrade do plano?',
  'O relatório não está carregando',
  'Quero cancelar minha assinatura',
];

function formatTime(ts: any): string {
  if (!ts) return '';
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function SupportChatButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQuick, setShowQuick] = useState(false);
  const [unread, setUnread] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevCountRef = useRef(0);
  const userId = auth?.currentUser?.uid;

  // Listen to messages in real time
  useEffect(() => {
    if (!userId) return;
    const unsub = listenSupportMessages(userId, (msgs) => {
      setMessages(msgs);
      // Count unread from support when chat is closed
      if (!open) {
        const newSupportMsgs = msgs.filter((m) => m.from === 'support').length;
        const prevSupport = prevCountRef.current;
        if (newSupportMsgs > prevSupport) {
          setUnread((u) => u + (newSupportMsgs - prevSupport));
        }
        prevCountRef.current = newSupportMsgs;
      } else {
        prevCountRef.current = msgs.filter((m) => m.from === 'support').length;
      }
    });
    return () => unsub && unsub();
  }, [userId, open]);

  // Clear unread when opening
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, open]);

  const doSend = async (text: string) => {
    if (!text.trim() || !userId) return;
    setLoading(true);
    setError('');
    try {
      const res = await sendSupportMessage(userId, text.trim());
      if (res.moderated) {
        setError(res.reason === 'rate_limit' ? 'Aguarde antes de enviar outra mensagem.' : 'Mensagem bloqueada pela moderação.');
      }
    } catch {
      setError('Erro ao enviar. Tente novamente.');
    }
    setInput('');
    setLoading(false);
    setShowQuick(false);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    doSend(input);
  };

  return (
    <>
      {/* Floating button */}
      <button
        className="fixed bottom-6 right-6 z-50 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/50 p-3 shadow-lg shadow-green-500/10 flex items-center justify-center transition-all group"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir chat de suporte"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
        {unread > 0 && !open && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-mono font-bold w-5 h-5 flex items-center justify-center animate-pulse">
            {unread}
          </span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-[340px] max-w-[95vw] bg-black border border-green-500/30 shadow-2xl shadow-green-500/5 flex flex-col" style={{ height: 480, maxHeight: '70vh' }}>
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-green-500/20 bg-black shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
            <span className="text-gray-600 text-[10px] ml-1 font-mono flex-1">support_terminal</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-500 text-[10px] font-mono">online</span>
            </div>
          </div>

          {/* Messages area */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-black text-xs font-mono min-h-0">
            {/* Welcome message (always shown) */}
            <div className="flex justify-start">
              <div className="px-3 py-2 max-w-[85%] bg-gray-900 text-gray-400 border border-gray-800">
                <span className="block text-[10px] text-green-500/70 mb-1">// devguard_support</span>
                Olá! Como posso ajudar? Escolha uma opção rápida ou escreva sua mensagem.
              </div>
            </div>

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`px-3 py-2 max-w-[85%] ${
                    msg.from === 'user'
                      ? 'bg-green-600/15 text-green-400 border border-green-500/30'
                      : 'bg-gray-900 text-gray-300 border border-gray-800'
                  }`}
                >
                  {msg.from === 'support' && (
                    <span className="block text-[10px] text-green-500/70 mb-1">// suporte</span>
                  )}
                  <span className="whitespace-pre-wrap break-words">{msg.message}</span>
                  {msg.createdAt && (
                    <span className="block text-[9px] text-gray-700 mt-1 text-right">{formatTime(msg.createdAt)}</span>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-end">
                <div className="px-3 py-2 bg-green-600/10 border border-green-500/20 text-green-500/50">
                  enviando<span className="animate-pulse">_</span>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-1.5 text-[10px] text-red-400 font-mono border-t border-red-500/20 bg-red-500/5 shrink-0">
              [ERROR] {error}
            </div>
          )}

          {/* Quick messages */}
          {showQuick && (
            <div className="border-t border-green-500/20 bg-black px-3 py-2 space-y-1 max-h-36 overflow-y-auto shrink-0">
              <div className="text-[10px] text-gray-600 font-mono mb-1">// mensagens rápidas</div>
              {QUICK_MESSAGES.map((qm) => (
                <button
                  key={qm}
                  onClick={() => doSend(qm)}
                  disabled={loading}
                  className="block w-full text-left px-2.5 py-1.5 text-[11px] font-mono text-gray-400 border border-green-500/10 hover:border-green-500/40 hover:text-green-400 hover:bg-green-600/5 transition-all disabled:opacity-40"
                >
                  &gt; {qm}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2.5 border-t border-green-500/20 bg-black shrink-0">
            <button
              type="button"
              onClick={() => setShowQuick((v) => !v)}
              className={`px-2 py-2 text-[10px] font-mono border transition-all shrink-0 ${
                showQuick
                  ? 'border-green-500/50 text-green-400 bg-green-600/10'
                  : 'border-green-500/20 text-gray-600 hover:text-green-400 hover:border-green-500/40'
              }`}
              title="Mensagens rápidas"
            >
              ⚡
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 min-w-0 bg-black/50 text-green-400 px-3 py-2 outline-none border border-green-500/20 focus:border-green-500/50 font-mono text-xs placeholder-gray-700 transition-colors"
              placeholder="$ mensagem..."
              disabled={loading}
              maxLength={500}
            />
            <button
              type="submit"
              className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/50 p-2 disabled:opacity-30 transition-all shrink-0"
              disabled={loading || !input.trim()}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
