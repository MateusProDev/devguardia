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
    // Listar todos os usuários que têm chats
    const unsub = onSnapshot(collection(db, 'support_chats'), async (snapshot) => {
      const users = snapshot.docs.map((doc) => doc.id);
      const chatData = await Promise.all(users.map(async (userId) => {
        const msgsQuery = query(collection(db, 'support_chats', userId, 'messages'), orderBy('createdAt', 'asc'));
        const msgsSnap = await getDocs(msgsQuery);
        return {
          userId,
          messages: msgsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)),
        };
      }));
      setChats(chatData);
    });
    return () => unsub();
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
