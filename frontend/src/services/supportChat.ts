import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import app from '../lib/firebase';

const db = getFirestore(app);

export function sendSupportMessage(userId, message) {
  return addDoc(collection(db, 'support_chats', userId, 'messages'), {
    message,
    createdAt: serverTimestamp(),
    from: 'user',
  });
}

export function sendSupportReply(userId, message) {
  return addDoc(collection(db, 'support_chats', userId, 'messages'), {
    message,
    createdAt: serverTimestamp(),
    from: 'support',
  });
}

export function listenSupportMessages(userId, callback) {
  const q = query(collection(db, 'support_chats', userId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
}
