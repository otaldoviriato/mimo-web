import * as admin from 'firebase-admin';

const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
const normalizedServiceAccount = rawServiceAccount?.startsWith("'") && rawServiceAccount?.endsWith("'")
  ? rawServiceAccount.slice(1, -1)
  : rawServiceAccount?.startsWith('"') && rawServiceAccount?.endsWith('"')
    ? rawServiceAccount.slice(1, -1)
    : rawServiceAccount;

const serviceAccount = normalizedServiceAccount 
  ? JSON.parse(normalizedServiceAccount) 
  : null;

if (serviceAccount && serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

if (!admin.apps.length && serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const adminMessaging = serviceAccount ? admin.messaging() : null;
export { admin };
