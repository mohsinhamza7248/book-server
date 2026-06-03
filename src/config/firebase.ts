import admin from 'firebase-admin';
import { logger } from './logger';

let firebaseApp: admin.app.App | null = null;

export function initFirebase(): admin.app.App | null {
  if (firebaseApp) return firebaseApp;

  const hasCredentials = 
    process.env.FIREBASE_PROJECT_ID && 
    process.env.FIREBASE_PROJECT_ID !== 'your-firebase-project-id' &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL;

  if (!hasCredentials) {
    logger.warn('⚠️ Firebase Admin credentials not configured or using placeholders. SMS OTP verification will be disabled. Use Test Login in development.');
    return null;
  }

  try {
    const serviceAccount: admin.ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    logger.info('✅ Firebase Admin initialized successfully');
    return firebaseApp;
  } catch (err) {
    logger.error('⚠️ Failed to initialize Firebase Admin cert:', err);
    return null;
  }
}

export function getFirebaseAdmin(): admin.app.App | null {
  if (!firebaseApp) return initFirebase();
  return firebaseApp;
}
