import { useEffect, useState } from 'react';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import app from '../lib/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

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

  useEffect(() => {
    if (!db) return;

    // Espera autenticação e verificação de claim admin antes de inscrever
    if (typeof window === 'undefined') {
      setAuthChecked(true);
      setIsAdmin(false);
      return;
    }
    // `db` is truthy only when running in the browser and `app` is initialized,
    // so it's safe to call `getAuth(app)` here and satisfy the Auth type.
    const firebaseAuth = getAuth(app as any);
      const unsubAuth = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        setIsAdmin(false);
        setAuthChecked(true);
        setChats([]);
        return;
      }

      try {
        // Force refresh the ID token to pick up recently-set custom claims
        const token = await user.getIdTokenResult(true);
        const adminClaim = (token.claims as any)?.admin === true;
        setIsAdmin(adminClaim);
        setAuthChecked(true);
      } catch (e) {
        console.error('Erro ao obter token do usuário', e);
        setIsAdmin(false);
        setAuthChecked(true);
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

          const msgsQ = query(collection(db, 'support_chats', userId, 'messages'), orderBy('createdAt', 'asc'));
          const unsubMsgs = onSnapshot(msgsQ, (msgsSnap) => {
            const messages = msgsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
            // DEBUG: mostrar mensagens recebidas para esta conversa
            console.log('messages for', userId, messages);
            setChats((prev) => {
              const others = prev.filter((c) => c.userId !== userId);
              return [...others, { userId, messages }];
            });
          }, (err) => {
            console.error('Erro ao escutar mensagens de', userId, err);
          });

          unsubMap[userId] = unsubMsgs;
        });
      }, (err) => {
        console.error('Erro ao escutar support_chats', err);
      });
    };

    // start listener only when authChecked and isAdmin
    const checkInterval = setInterval(() => {
      if (authChecked && isAdmin) {
        startMainListener();
        clearInterval(checkInterval);
      }
      if (authChecked && !isAdmin) {
        // usuário não é admin — limpa tudo
        setChats([]);
        clearInterval(checkInterval);
      }
    }, 200);

    return () => {
      unsubAuth();
      if (mainUnsub) mainUnsub();
      Object.values(unsubMap).forEach((u) => u());
      clearInterval(checkInterval);
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
