
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, Firestore } from 'firebase/firestore';
import app from '../lib/firebase';

let db: Firestore | undefined = undefined;
if (typeof window !== 'undefined' && app) {
  db = getFirestore(app);
}


export async function sendSupportMessage(userId: string, message: string) {
  // Use the serverless endpoint (Vercel) which will moderate and write to Firestore
  const resp = await fetch('/api/support/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message, from: 'user' }),
  });
  return resp.json();
}


export async function sendSupportReply(userId: string, message: string) {
  const resp = await fetch('/api/support/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
