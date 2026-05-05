import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Endpoint serverless para moderação e escrita segura de mensagens em Firestore
// Requisitos de env:
// - FIREBASE_SERVICE_ACCOUNT: JSON string do service account
// - FIREBASE_PROJECT_ID: id do projeto

/** Normalizes a Firebase private key from env var to valid PEM format.
 *  Handles: extra quotes, literal \\n, double-escaped \\\\n, JSON-encoded strings, missing newlines. */
function normalizePrivateKey(raw: string): string {
  let key = raw.trim();

  // Strip surrounding double or single quotes (Vercel UI sometimes adds them)
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  // If it looks like a JSON string (starts with "), try parsing it
  if (key.startsWith('"')) {
    try { key = JSON.parse(key); } catch { /* keep as-is */ }
  }

  // Replace double-escaped newlines \\n → \n, then literal \n → real newline
  key = key.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');

  // Ensure the key has proper BEGIN/END markers with newlines
  if (!key.includes('\n') && key.includes('-----BEGIN')) {
    // Everything is on one line — insert newlines at the markers
    key = key
      .replace(/(-----BEGIN [A-Z ]+-----)/, '$1\n')
      .replace(/(-----END [A-Z ]+-----)/, '\n$1');
  }

  return key;
}

function initFirebase() {
  if (admin.apps.length) return;

  // Opção 1: JSON completo em FIREBASE_SERVICE_ACCOUNT
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (sa) {
    const cred = JSON.parse(sa);
    admin.initializeApp({
      credential: admin.credential.cert(cred),
      projectId: process.env.FIREBASE_PROJECT_ID || cred.project_id,
    });
    return;
  }

  // Opção 2: variáveis separadas (mesmo formato do backend)
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    privateKey = normalizePrivateKey(privateKey);
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
    return;
  }

  throw new Error(
    'Firebase Admin não configurado. Defina FIREBASE_SERVICE_ACCOUNT (JSON) OU FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.',
  );
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

export async function POST(req: NextRequest) {
  // CORS-ish origin check (best-effort)
  const origin = req.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ ok: false, error: 'origin_not_allowed' }, { status: 403 });
  }

  try {
    initFirebase();
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error('init firebase error', msg);
    return NextResponse.json(
      { ok: false, error: 'server_init', detail: msg },
      { status: 500 },
    );
  }

  const db = admin.firestore();
  const body = await req.json();
  const { userId, message, from } = body || {};

  // Require Firebase ID token from client for authentication
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ ok: false, error: 'missing_auth' }, { status: 401 });
  }
  const idToken = authHeader.split(' ')[1];
  let tokenClaims: admin.auth.DecodedIdToken;
  try {
    tokenClaims = await admin.auth().verifyIdToken(idToken);
  } catch (e: any) {
    console.error('verifyIdToken error', e && e.message);
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
  }

  // Authorization rules:
  // - if `from` is 'user', token uid must match userId
  // - if `from` is 'support', token must have custom claim `admin: true`
  if (from === 'user' && tokenClaims.uid !== userId) {
    return NextResponse.json({ ok: false, error: 'forbidden_user_mismatch' }, { status: 403 });
  }
  if (from === 'support' && tokenClaims.admin !== true) {
    return NextResponse.json({ ok: false, error: 'forbidden_not_admin' }, { status: 403 });
  }
  if (!userId || !message || !from) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
  }
  if (typeof message !== 'string' || message.length === 0 || message.length > 2000) {
    return NextResponse.json({ ok: false, error: 'invalid_message' }, { status: 400 });
  }
  if (!['user', 'support'].includes(from)) {
    return NextResponse.json({ ok: false, error: 'invalid_from' }, { status: 400 });
  }

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
    return NextResponse.json({ ok: true, moderated: true, reason: 'rate_limit' }, { status: 429 });
  }

  // basic moderation: links and blacklist
  const urlRegex = /https?:\/\/[\w\-./?%&=+#]+/i;
  if (urlRegex.test(message)) {
    return NextResponse.json({ ok: true, moderated: true, reason: 'contains_link' });
  }
  const blacklist = ['phishing', 'malware', 'credit card', 'senha', 'password'];
  const lowered = message.toLowerCase();
  const found = blacklist.find((w) => lowered.includes(w));
  if (found) {
    return NextResponse.json({ ok: true, moderated: true, reason: 'suspicious_content' });
  }

  // write message to Firestore with server timestamp
  const messagesRef = db.collection('support_chats').doc(userId).collection('messages');
  const docRef = await messagesRef.add({
    message,
    from,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    moderated: false,
    flagged: false,
  });

  // Ensure parent document exists so admins can list conversations
  await db.collection('support_chats').doc(userId).set({ lastMessageAt: now }, { merge: true });

  return NextResponse.json({ ok: true, id: docRef.id, moderated: false });
}
