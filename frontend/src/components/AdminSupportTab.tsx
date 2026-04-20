import { useEffect, useState } from 'react';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import app from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { listenSupportMessages } from '../services/supportChat';

interface Message {
  id: string;
  message: string;
  from: string;
  createdAt?: any;
}

export default function AdminSupportTab() {
  const [chats, setChats] = useState<{ userId: string; messages: Message[] }[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const db = typeof window !== 'undefined' && app ? getFirestore(app) : undefined;

  console.log('AdminSupportTab mounted', { db, auth });

  useEffect(() => {
    if (!db) return;

    // Espera autenticação e verificação de claim admin antes de inscrever
    if (typeof window === 'undefined') {
      setAuthChecked(true);
      setIsAdmin(false);
      return;
    }
    // Use the shared `auth` instance from `lib/firebase`
    const firebaseAuth = auth as any;
    const unsubAuth = onAuthStateChanged(firebaseAuth, async (user) => {
      console.log('onAuthStateChanged callback, user:', user);
      if (!user) {
        setIsAdmin(false);
        setAuthChecked(true);
        setChats([]);
        return;
      }

      try {
        // Force refresh the ID token to pick up recently-set custom claims
        await user.getIdToken(true);
        const token = await user.getIdTokenResult(true);
        console.log('token claims after refresh', token.claims);
        const adminClaim = (token.claims as any)?.admin === true;
        setIsAdmin(adminClaim);
        setAuthChecked(true);
        if (adminClaim) {
          // start listeners now that token is refreshed
          startMainListener();
        } else {
          // not admin: clear any existing chats
          setChats([]);
        }
      } catch (e) {
        console.error('Erro ao obter token do usuário', e);
        setIsAdmin(false);
        setAuthChecked(true);
        setChats([]);
      }
    });

    // Mantemos um mapa de unsubscribers para cada conversa (userId)
    const unsubMap: Record<string, () => void> = {};

    let mainUnsub: (() => void) | null = null;

    // Quando temos confirmação de admin, iniciamos o listener principal
    const startMainListener = () => {
      if (mainUnsub) return;
      mainUnsub = onSnapshot(collection(db, 'support_chats'), (snapshot) => {
        const userIds = snapshot.docs.map((d) => d.id);
        // DEBUG: listar ids de conversas encontradas
        console.log('support_chats snapshot:', userIds);

        // Cancelar inscrições removidas
        Object.keys(unsubMap).forEach((uid) => {
          if (!userIds.includes(uid)) {
            unsubMap[uid]();
            delete unsubMap[uid];
            setChats((prev) => prev.filter((c) => c.userId !== uid));
          }
        });

        // Adicionar novas inscrições
        userIds.forEach((userId) => {
          if (unsubMap[userId]) return; // já inscrito

          // Reuse the dashboard listener helper for consistency
          const unsubMsgs = listenSupportMessages(userId, (messages) => {
            console.log('messages for', userId, messages);
            setChats((prev) => {
              const others = prev.filter((c) => c.userId !== userId);
              const newList = [...others, { userId, messages }];
              // Ordena conversas pelo timestamp da última mensagem (desc)
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

    // Start listener immediately when we detect admin in the auth callback.
    // The auth callback will call `startMainListener` when adminClaim is true.

    return () => {
      unsubAuth();
      if (mainUnsub) mainUnsub();
      Object.values(unsubMap).forEach((u) => u());
      // nothing else to cleanup
    };
  }, [db]);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Suporte - Mensagens dos Usuários</h2>
      {!authChecked && <div className="text-gray-400">Verificando autenticação...</div>}
      {authChecked && !isAdmin && <div className="text-yellow-400">Acesso restrito: faça login como admin.</div>}
      {authChecked && isAdmin && chats.length === 0 && <div className="text-gray-500">Nenhuma conversa encontrada.</div>}
      <div className="space-y-8">
        {chats.map((chat) => (
          <div key={chat.userId} className="border border-gray-800 rounded-lg p-4 bg-gray-900">
            <div className="font-semibold text-blue-400 mb-2">Usuário: {chat.userId}</div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {chat.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-3 py-2 rounded-lg max-w-[80%] ${msg.from === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                    <span className="block text-xs text-gray-400 mb-1">{msg.from === 'user' ? 'Usuário' : 'Suporte'}</span>
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
