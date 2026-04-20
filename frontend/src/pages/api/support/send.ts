import type { NextApiRequest, NextApiResponse } from 'next';

// Endpoint serverless para moderação e escrita segura de mensagens em Firestore
// Requisitos de env:
// - FIREBASE_SERVICE_ACCOUNT: JSON string do service account
// - FIREBASE_PROJECT_ID: id do projeto

import admin from 'firebase-admin';

function initFirebase() {
  if (!admin.apps.length) {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT não configurado');
    const cred = JSON.parse(sa);
    admin.initializeApp({
      credential: admin.credential.cert(cred),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
}

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_MESSAGES = 5;

const ALLOWED_ORIGINS = [
  'https://app.devguardia.cloud',
  'https://devguardia-git-main-mateus-ferreiras-projects.vercel.app',
  'https://devguardia-fhlomykdv-mateus-ferreiras-projects.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // CORS-ish origin check (best-effort)
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ ok: false, error: 'origin_not_allowed' });
  }
  try {
    initFirebase();
  } catch (err: any) {
    console.error('init firebase error', err.message || err);
    return res.status(500).json({ ok: false, error: 'server_init' });
  }
  const db = admin.firestore();
  const { userId, message, from } = req.body || {};
  // Require Firebase ID token from client for authentication
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'missing_auth' });
  }
  const idToken = authHeader.split(' ')[1];
  let tokenClaims: admin.auth.DecodedIdToken;
  try {
    tokenClaims = await admin.auth().verifyIdToken(idToken);
  } catch (e: any) {
    console.error('verifyIdToken error', e && e.message);
    return res.status(401).json({ ok: false, error: 'invalid_token' });
  }

  // Authorization rules:
  // - if `from` is 'user', token uid must match userId
  // - if `from` is 'support', token must have custom claim `admin: true`
  if (from === 'user' && tokenClaims.uid !== userId) {
    return res.status(403).json({ ok: false, error: 'forbidden_user_mismatch' });
  }
  if (from === 'support' && tokenClaims.admin !== true) {
    return res.status(403).json({ ok: false, error: 'forbidden_not_admin' });
  }
  if (!userId || !message || !from) return res.status(400).json({ ok: false, error: 'missing_fields' });
  if (typeof message !== 'string' || message.length === 0 || message.length > 2000) {
    return res.status(400).json({ ok: false, error: 'invalid_message' });
  }
  if (!['user', 'support'].includes(from)) return res.status(400).json({ ok: false, error: 'invalid_from' });

  const now = admin.firestore.Timestamp.now();

  // rate limit simple per user
  const metaRef = db.collection('support_meta').doc(userId);
  const metaSnap = await metaRef.get();
  let timestamps: admin.firestore.Timestamp[] = [];
  if (metaSnap.exists) {
    const data = metaSnap.data() || {};
    timestamps = (data.timestamps || []).map((t: any) => {
      if (t && t._seconds) return new admin.firestore.Timestamp(t._seconds, t._nanoseconds || 0);
      return t;
    });
    timestamps = timestamps.filter((t) => now.seconds - t.seconds <= RATE_LIMIT_WINDOW_SECONDS);
  }
  timestamps.push(now);
  await metaRef.set({ timestamps }, { merge: true });
  if (timestamps.length > RATE_LIMIT_MAX_MESSAGES) {
    return res.status(429).json({ ok: false, moderated: true, reason: 'rate_limit' });
  }

  // basic moderation: links and blacklist
  const urlRegex = /https?:\/\/[\w\-./?%&=+#]+/i;
  if (urlRegex.test(message)) {
    return res.status(200).json({ ok: true, moderated: true, reason: 'contains_link' });
  }
  const blacklist = ['phishing', 'malware', 'credit card', 'senha', 'password'];
  const lowered = message.toLowerCase();
  const found = blacklist.find((w) => lowered.includes(w));
  if (found) return res.status(200).json({ ok: true, moderated: true, reason: 'suspicious_content' });

  // write message to Firestore with server timestamp
  const messagesRef = db.collection('support_chats').doc(userId).collection('messages');
  const docRef = await messagesRef.add({
    message,
    from,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    moderated: false,
    flagged: false,
  });

  return res.status(200).json({ ok: true, id: docRef.id, moderated: false });
}
