import { useEffect, useState, useRef, FormEvent } from 'react';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import app from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { listenSupportMessages, sendSupportReply } from '../services/supportChat';
import { Send, ChevronDown, ChevronRight, MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  message: string;
  from: string;
  createdAt?: any;
}

interface Chat {
  userId: string;
  messages: Message[];
}

const ADMIN_QUICK_REPLIES = [
  'Olá! Em que posso ajudá-lo?',
  'Seu problema foi resolvido. Pode verificar novamente?',
  'Vou verificar e retorno em breve.',
  'O scan foi reprocessado com sucesso.',
  'Seu pagamento foi confirmado. Obrigado!',
  'Pode me enviar mais detalhes sobre o problema?',
];

function formatTime(ts: any): string {
  if (!ts) return '';
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: any): string {
  if (!ts) return '';
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function timeSince(ts: any): string {
  if (!ts) return '';
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return formatDate(ts);
}

export default function AdminSupportTab() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [expandedChat, setExpandedChat] = useState<string | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showQuickFor, setShowQuickFor] = useState<string | null>(null);
  const chatRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const db = typeof window !== 'undefined' && app ? getFirestore(app) : undefined;

  useEffect(() => {
    if (!db) return;

    if (typeof window === 'undefined') {
      setAuthChecked(true);
      setIsAdmin(false);
      return;
    }

    const firebaseAuth = auth as any;
    const unsubAuth = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        setIsAdmin(false);
        setAuthChecked(true);
        setChats([]);
        return;
      }

      try {
        await user.getIdToken(true);
        const token = await user.getIdTokenResult(true);
        const adminClaim = (token.claims as any)?.admin === true;
        setIsAdmin(adminClaim);
        setAuthChecked(true);
        if (adminClaim) {
          startMainListener();
        } else {
          setChats([]);
        }
      } catch (e) {
        console.error('Erro ao obter token do usuário', e);
        setIsAdmin(false);
        setAuthChecked(true);
        setChats([]);
      }
    });

    const unsubMap: Record<string, () => void> = {};
    let mainUnsub: (() => void) | null = null;

    const startMainListener = () => {
      if (mainUnsub) return;
      mainUnsub = onSnapshot(collection(db, 'support_chats'), (snapshot) => {
        const userIds = snapshot.docs.map((d) => d.id);

        Object.keys(unsubMap).forEach((uid) => {
          if (!userIds.includes(uid)) {
            unsubMap[uid]();
            delete unsubMap[uid];
            setChats((prev) => prev.filter((c) => c.userId !== uid));
          }
        });

        userIds.forEach((userId) => {
          if (unsubMap[userId]) return;

          const unsubMsgs = listenSupportMessages(userId, (messages) => {
            setChats((prev) => {
              const others = prev.filter((c) => c.userId !== userId);
              const newList = [...others, { userId, messages }];
              newList.sort((a, b) => {
                const ta = a.messages[a.messages.length - 1]?.createdAt?.seconds || 0;
                const tb = b.messages[b.messages.length - 1]?.createdAt?.seconds || 0;
                return tb - ta;
              });
              return newList;
            });
          });

          unsubMap[userId] = unsubMsgs as unknown as () => void;
        });
      }, (err) => {
        console.error('Erro ao escutar support_chats', err);
      });
    };

    return () => {
      unsubAuth();
      if (mainUnsub) mainUnsub();
      Object.values(unsubMap).forEach((u) => u());
    };
  }, [db]);

  // Auto-scroll when expanded chat gets new messages
  useEffect(() => {
    if (expandedChat && chatRefs.current[expandedChat]) {
      const el = chatRefs.current[expandedChat];
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [chats, expandedChat]);

  const handleReply = async (userId: string, text: string) => {
    if (!text.trim()) return;
    setSending((s) => ({ ...s, [userId]: true }));
    setErrors((e) => ({ ...e, [userId]: '' }));
    try {
      const res = await sendSupportReply(userId, text.trim());
      if (res.moderated) {
        setErrors((e) => ({ ...e, [userId]: `Bloqueado: ${res.reason}` }));
      } else {
        setReplyInputs((r) => ({ ...r, [userId]: '' }));
        setShowQuickFor(null);
      }
    } catch {
      setErrors((e) => ({ ...e, [userId]: 'Erro ao enviar resposta.' }));
    }
    setSending((s) => ({ ...s, [userId]: false }));
  };

  const handleSubmit = (userId: string) => (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleReply(userId, replyInputs[userId] || '');
  };

  const toggleChat = (userId: string) => {
    setExpandedChat((prev) => (prev === userId ? null : userId));
    setShowQuickFor(null);
  };

  const getLastMessage = (chat: Chat): Message | undefined => {
    return chat.messages[chat.messages.length - 1];
  };

  const getLastUserMessage = (chat: Chat): Message | undefined => {
    return [...chat.messages].reverse().find((m) => m.from === 'user');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-mono font-bold text-green-400 flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          [SUPPORT_INBOX]
        </h2>
        <span className="text-[10px] font-mono text-gray-600">
          {chats.length} conversa{chats.length !== 1 ? 's' : ''} ativa{chats.length !== 1 ? 's' : ''}
        </span>
      </div>

      {!authChecked && (
        <div className="text-gray-600 text-xs font-mono flex items-center gap-2">
          <span className="animate-pulse">●</span> Verificando autenticação...
        </div>
      )}
      {authChecked && !isAdmin && (
        <div className="text-yellow-400 text-xs font-mono border border-yellow-500/20 px-3 py-2">
          [ACCESS_RESTRICTED] // faça login como admin
        </div>
      )}
      {authChecked && isAdmin && chats.length === 0 && (
        <div className="text-gray-600 text-xs font-mono border border-green-500/10 px-4 py-8 text-center">
          // Nenhuma conversa encontrada. As mensagens dos usuários aparecerão aqui em tempo real.
        </div>
      )}

      <div className="space-y-2">
        {chats.map((chat) => {
          const isExpanded = expandedChat === chat.userId;
          const lastMsg = getLastMessage(chat);
          const lastUserMsg = getLastUserMessage(chat);
          const lastMsgIsUser = lastMsg?.from === 'user';
          const msgCount = chat.messages.length;

          return (
            <div key={chat.userId} className={`border transition-all ${isExpanded ? 'border-green-500/40' : lastMsgIsUser ? 'border-yellow-500/30' : 'border-green-500/15'} bg-black`}>
              {/* Chat header - clickable */}
              <button
                onClick={() => toggleChat(chat.userId)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-green-500/5 transition-all"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-green-500 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-green-400 truncate">{chat.userId.slice(0, 20)}...</span>
                    {lastMsgIsUser && (
                      <span className="text-[9px] font-mono bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 shrink-0">
                        AGUARDANDO
                      </span>
                    )}
                  </div>
                  {lastUserMsg && (
                    <p className="text-[11px] font-mono text-gray-500 truncate mt-0.5">
                      {lastUserMsg.message}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-gray-600 block">{timeSince(lastMsg?.createdAt)}</span>
                  <span className="text-[10px] font-mono text-gray-700">{msgCount} msg{msgCount !== 1 ? 's' : ''}</span>
                </div>
              </button>

              {/* Expanded chat content */}
              {isExpanded && (
                <div className="border-t border-green-500/20">
                  {/* Messages */}
                  <div
                    ref={(el) => { chatRefs.current[chat.userId] = el; }}
                    className="overflow-y-auto p-3 space-y-2 text-xs font-mono"
                    style={{ maxHeight: 320 }}
                  >
                    {chat.messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`px-3 py-2 max-w-[80%] ${
                            msg.from === 'user'
                              ? 'bg-green-600/10 text-green-400 border border-green-500/20'
                              : 'bg-gray-900 text-gray-300 border border-gray-700'
                          }`}
                        >
                          <span className="block text-[9px] text-gray-600 mb-1">
                            {msg.from === 'user' ? '// user' : '// admin_reply'}
                          </span>
                          <span className="whitespace-pre-wrap break-words">{msg.message}</span>
                          {msg.createdAt && (
                            <span className="block text-[9px] text-gray-700 mt-1 text-right">
                              {formatDate(msg.createdAt)} {formatTime(msg.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Error */}
                  {errors[chat.userId] && (
                    <div className="px-3 py-1.5 text-[10px] text-red-400 font-mono border-t border-red-500/20 bg-red-500/5">
                      [ERROR] {errors[chat.userId]}
                    </div>
                  )}

                  {/* Quick replies */}
                  {showQuickFor === chat.userId && (
                    <div className="border-t border-green-500/15 px-3 py-2 space-y-1 max-h-32 overflow-y-auto bg-black">
                      <div className="text-[10px] text-gray-600 font-mono mb-1">// respostas rápidas</div>
                      {ADMIN_QUICK_REPLIES.map((qr) => (
                        <button
                          key={qr}
                          onClick={() => handleReply(chat.userId, qr)}
                          disabled={sending[chat.userId]}
                          className="block w-full text-left px-2.5 py-1.5 text-[11px] font-mono text-gray-400 border border-green-500/10 hover:border-green-500/40 hover:text-green-400 hover:bg-green-600/5 transition-all disabled:opacity-40"
                        >
                          &gt; {qr}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Reply input */}
                  <form
                    onSubmit={handleSubmit(chat.userId)}
                    className="flex items-center gap-2 p-2.5 border-t border-green-500/20 bg-black"
                  >
                    <button
                      type="button"
                      onClick={() => setShowQuickFor((v) => (v === chat.userId ? null : chat.userId))}
                      className={`px-2 py-2 text-[10px] font-mono border transition-all shrink-0 ${
                        showQuickFor === chat.userId
                          ? 'border-green-500/50 text-green-400 bg-green-600/10'
                          : 'border-green-500/20 text-gray-600 hover:text-green-400 hover:border-green-500/40'
                      }`}
                      title="Respostas rápidas"
                    >
                      ⚡
                    </button>
                    <input
                      type="text"
                      value={replyInputs[chat.userId] || ''}
                      onChange={(e) => setReplyInputs((r) => ({ ...r, [chat.userId]: e.target.value }))}
                      className="flex-1 min-w-0 bg-black/50 text-green-400 px-3 py-2 outline-none border border-green-500/20 focus:border-green-500/50 font-mono text-xs placeholder-gray-700 transition-colors"
                      placeholder="$ responder..."
                      disabled={sending[chat.userId]}
                      maxLength={2000}
                    />
                    <button
                      type="submit"
                      className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/50 p-2 disabled:opacity-30 transition-all shrink-0"
                      disabled={sending[chat.userId] || !(replyInputs[chat.userId] || '').trim()}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
