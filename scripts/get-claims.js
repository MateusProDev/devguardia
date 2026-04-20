/* Usage:
   node scripts/get-claims.js <USER_UID>
   Requires FIREBASE_SERVICE_ACCOUNT env or GOOGLE_APPLICATION_CREDENTIALS pointing to service account JSON.
*/
const admin = require('firebase-admin');

function init() {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (sa) {
    try {
      const cred = JSON.parse(sa);
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
    // ignore if already initialized
  }
}

async function main() {
  init();
  const uid = process.argv[2];
  if (!uid) {
    console.error('Usage: node scripts/get-claims.js <USER_UID>');
    process.exit(1);
  }
  try {
    const user = await admin.auth().getUser(uid);
    console.log('UID:', user.uid);
    console.log('customClaims:', JSON.stringify(user.customClaims || {}, null, 2));
  } catch (e) {
    console.error('Error fetching user:', e.message || e);
    process.exit(1);
  }
}

main();
