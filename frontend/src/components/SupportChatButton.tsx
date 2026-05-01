
import { useEffect, useRef, useState, FormEvent, MutableRefObject } from 'react';
import { sendSupportMessage, listenSupportMessages } from '../services/supportChat';
import { auth } from '../lib/firebase';
import { MessageCircle } from 'lucide-react';

interface SupportMessage {
  id: string;
  message: string;
  from: string;
  createdAt?: any;
}

export default function SupportChatButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const userId = auth?.currentUser?.uid;

  useEffect(() => {
    if (!open || !userId) return;
    const unsub = listenSupportMessages(userId, setMessages);
    return () => unsub && unsub();
  }, [open, userId]);

  useEffect(() => {
    if (open && chatRef.current) {
      (chatRef.current as HTMLDivElement).scrollTop = (chatRef.current as HTMLDivElement).scrollHeight;
    }
  }, [messages, open]);

  const sendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !userId) return;
    setLoading(true);
    await sendSupportMessage(userId, input.trim());
    setInput('');
    setLoading(false);
  };

  return (
    <>
      <button
        className="fixed bottom-6 right-6 z-50 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/50 p-3 shadow-lg flex items-center justify-center transition-all"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir chat de suporte"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 max-w-[95vw] bg-black border border-green-500/30 shadow-2xl shadow-green-500/5 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-green-500/20">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
            <span className="text-gray-600 text-xs ml-1 font-mono flex-1">support_chat</span>
            <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-red-400 font-mono text-xs">[X]</button>
          </div>
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-black text-xs font-mono" style={{ maxHeight: 350 }}>
            {messages.length === 0 && <div className="text-gray-700 text-center">// Nenhuma mensagem</div>}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-3 py-2 max-w-[80%] ${msg.from === 'user' ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'bg-gray-900 text-gray-400 border border-gray-800'}`}>
                  {msg.message}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="flex items-center gap-2 p-3 border-t border-green-500/20 bg-black">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-black/50 text-green-400 px-3 py-2 outline-none border border-green-500/20 focus:border-green-500/50 font-mono text-xs placeholder-gray-700"
              placeholder="$ mensagem..."
              disabled={loading}
              maxLength={500}
              required
            />
            <button
              type="submit"
              className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/50 px-3 py-2 disabled:opacity-40 font-mono text-xs"
              disabled={loading || !input.trim()}
            >
              [SEND]
            </button>
          </form>
        </div>
      )}
    </>
  );
}
