/*
Usage:
  node scripts/set-admin-claim.js <USER_UID>

Requires one of:
- env FIREBASE_SERVICE_ACCOUNT containing the service account JSON (single-line or multi-line), or
- GOOGLE_APPLICATION_CREDENTIALS pointing to a service account JSON file.

This script uses the Firebase Admin SDK to set custom claim `admin: true` for the given UID.
*/

const admin = require('firebase-admin');

async function main() {
  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saEnv) {
    let cred;
    try {
      cred = JSON.parse(saEnv);
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
      process.exit(1);
    }
    admin.initializeApp({ credential: admin.credential.cert(cred) });
  } else {
    // Fallback to ADC via GOOGLE_APPLICATION_CREDENTIALS
    try {
      admin.initializeApp();
    } catch (e) {
      console.error('Failed to initialize admin SDK. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS.');
      console.error(e);
      process.exit(1);
    }
  }

  const uid = process.argv[2];
  if (!uid) {
    console.error('Usage: node scripts/set-admin-claim.js <USER_UID>');
    process.exit(1);
  }

  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`Custom claim set: admin=true for UID ${uid}`);
    process.exit(0);
  } catch (err) {
    console.error('Error setting custom claims:', err);
    process.exit(1);
  }
}

main();
