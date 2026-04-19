const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicialize o app admin — se já inicializado no seu projeto, remova ou adapte
try {
  admin.initializeApp();
} catch (e) {
  // já inicializado
}

const db = admin.firestore();

// Configurações de moderação
const RATE_LIMIT_WINDOW_SECONDS = 60; // janela em segundos
const RATE_LIMIT_MAX_MESSAGES = 5; // máximo mensagens por janela
const SUPPORT_META_COLLECTION = 'support_meta';

exports.moderateSupportMessage = functions.firestore
  .document('support_chats/{userId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const data = snap.data() || {};
    const userId = context.params.userId;
    const message = (data.message || '').toString();
    const now = admin.firestore.Timestamp.now();

    // 1) Rate limiting simples por usuário (guarda timestamps no doc support_meta/{userId})
    const metaRef = db.collection(SUPPORT_META_COLLECTION).doc(userId);
    const metaSnap = await metaRef.get();
    let timestamps = [];
    if (metaSnap.exists) {
      timestamps = metaSnap.data().timestamps || [];
      // converter para Timestamp caso esteja em formato plain object
      timestamps = timestamps.map(t => (t._seconds ? new admin.firestore.Timestamp(t._seconds, t._nanoseconds || 0) : t));
      // filtrar pela janela
      timestamps = timestamps.filter(t => (now.seconds - t.seconds) <= RATE_LIMIT_WINDOW_SECONDS);
    }

    timestamps.push(now);
    await metaRef.set({ timestamps }, { merge: true });

    if (timestamps.length > RATE_LIMIT_MAX_MESSAGES) {
      await snap.ref.update({ moderated: true, flagged: true, reason: 'rate_limit' });
      console.log(`Message ${snap.id} flagged for rate limit (user ${userId})`);
      return null;
    }

    // 2) Detectar links/URLs simples
    const urlRegex = /https?:\/\/[\w\-./?%&=+#]+/i;
    const hasLink = urlRegex.test(message);
    if (hasLink) {
      await snap.ref.update({ moderated: true, flagged: true, reason: 'contains_link' });
      console.log(`Message ${snap.id} flagged for containing link (user ${userId})`);
      return null;
    }

    // 3) Detectar palavras suspeitas (exemplo básico)
    const blacklist = ['phishing', 'malware', 'credit card', 'senha', 'password'];
    const lowered = message.toLowerCase();
    const found = blacklist.find(w => lowered.includes(w));
    if (found) {
      await snap.ref.update({ moderated: true, flagged: true, reason: 'suspicious_content' });
      console.log(`Message ${snap.id} flagged for suspicious content: ${found}`);
      return null;
    }

    // 4) Se passar nas checagens, marque como moderado=false (permitido)
    await snap.ref.update({ moderated: false, flagged: false });
    console.log(`Message ${snap.id} approved (user ${userId})`);
    return null;
  });
