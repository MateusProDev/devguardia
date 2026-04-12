'use client';

import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export async function signInWithGoogle() {
  if (!auth) throw new Error('Firebase not initialized');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOut() {
  if (!auth) return;
  await firebaseSignOut(auth);
}

export async function getIdToken(): Promise<string | null> {
  if (!auth) return null;
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
