
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
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir chat de suporte"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 max-w-[95vw] bg-gray-900 border border-gray-800 rounded-xl shadow-2xl flex flex-col">
          <div className="p-4 border-b border-gray-800 font-semibold text-white flex items-center justify-between">
            Suporte DevGuard
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">×</button>
          </div>
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-950 text-sm" style={{ maxHeight: 350 }}>
            {messages.length === 0 && <div className="text-gray-500 text-center">Nenhuma mensagem ainda.</div>}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-3 py-2 rounded-lg max-w-[80%] ${msg.from === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                  {msg.message}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="flex items-center gap-2 p-3 border-t border-gray-800 bg-gray-900">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-lg bg-gray-800 text-white px-3 py-2 outline-none border border-gray-700 focus:border-blue-500"
              placeholder="Digite sua mensagem..."
              disabled={loading}
              maxLength={500}
              required
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              disabled={loading || !input.trim()}
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}
