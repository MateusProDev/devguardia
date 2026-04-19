
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, Firestore } from 'firebase/firestore';
import app from '../lib/firebase';

let db: Firestore | undefined = undefined;
if (typeof window !== 'undefined' && app) {
  db = getFirestore(app);
}


export function sendSupportMessage(userId: string, message: string) {
  if (!db) throw new Error('Firestore não inicializado');
  return addDoc(collection(db, 'support_chats', userId, 'messages'), {
    message,
    createdAt: serverTimestamp(),
    from: 'user',
  });
}


export function sendSupportReply(userId: string, message: string) {
  if (!db) throw new Error('Firestore não inicializado');
  return addDoc(collection(db, 'support_chats', userId, 'messages'), {
    message,
    createdAt: serverTimestamp(),
    from: 'support',
  });
}


export function listenSupportMessages(userId: string, callback: (messages: any[]) => void) {
  if (!db) return () => {};
  const q = query(collection(db, 'support_chats', userId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
}
