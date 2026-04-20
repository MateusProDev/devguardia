const admin = require('firebase-admin');

function init() {
  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saEnv) {
    try {
      const cred = JSON.parse(saEnv);
      admin.initializeApp({ credential: admin.credential.cert(cred) });
      return;
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT invalid JSON');
      process.exit(1);
    }
  }
  try {
    admin.initializeApp();
  } catch (e) {
    console.error('Failed to initialize admin SDK');
  }
}

async function main() {
  init();
  const uid = process.argv[2];
  if (!uid) {
    console.error('Usage: node scripts/set-admin-claim.cjs <USER_UID>');
    process.exit(1);
  }
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`Custom claim set: admin=true for UID ${uid}`);
  } catch (e) {
    console.error('Error setting custom claims:', e.message || e);
    process.exit(1);
  }
}

main();
