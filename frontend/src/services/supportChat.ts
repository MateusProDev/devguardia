import { getFirestore, collection, query, orderBy, onSnapshot, Firestore } from 'firebase/firestore';
import app, { auth } from '../lib/firebase';

let db: Firestore | undefined = undefined;
if (typeof window !== 'undefined' && app) {
  db = getFirestore(app);
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth?.currentUser;
  if (!user) return { 'Content-Type': 'application/json' };
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function sendSupportMessage(userId: string, message: string) {
  const headers = await getAuthHeaders();
  const resp = await fetch('/api/support/send', {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId, message, from: 'user' }),
  });
  return resp.json();
}

export async function sendSupportReply(userId: string, message: string) {
  const headers = await getAuthHeaders();
  const resp = await fetch('/api/support/send', {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId, message, from: 'support' }),
  });
  return resp.json();
}

export function listenSupportMessages(userId: string, callback: (messages: any[]) => void) {
  if (!db) return () => {};
  const q = query(collection(db, 'support_chats', userId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
}
