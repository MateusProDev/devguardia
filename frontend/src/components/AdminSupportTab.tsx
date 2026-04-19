import { useEffect, useState } from 'react';
import { getFirestore, collection, query, orderBy, onSnapshot, doc, getDocs } from 'firebase/firestore';
import app from '../lib/firebase';

interface Message {
  id: string;
  message: string;
  from: string;
  createdAt?: any;
}

export default function AdminSupportTab() {
  const [chats, setChats] = useState<{ userId: string; messages: Message[] }[]>([]);
  const db = typeof window !== 'undefined' && app ? getFirestore(app) : undefined;

  useEffect(() => {
    if (!db) return;

    // Mantemos um mapa de unsubscribers para cada conversa (userId)
    const unsubMap: Record<string, () => void> = {};

    // Quando a lista de conversas muda, sincronizamos as inscrições por subcoleção
    const mainUnsub = onSnapshot(collection(db, 'support_chats'), (snapshot) => {
      const userIds = snapshot.docs.map((d) => d.id);

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

    return () => {
      mainUnsub();
      Object.values(unsubMap).forEach((u) => u());
    };
  }, [db]);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Suporte - Mensagens dos Usuários</h2>
      {chats.length === 0 && <div className="text-gray-500">Nenhuma conversa encontrada.</div>}
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
