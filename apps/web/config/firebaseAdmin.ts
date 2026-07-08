// config/firebaseAdmin.ts
import * as admin from 'firebase-admin';

// Ensure required environment variables are set.
if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY
) {
  throw new Error('Missing Firebase Admin SDK environment variables.');
}

// Initialize the Firebase Admin SDK only once.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
    // Throw an error to stop the application from starting with a broken configuration.
    throw new Error('Failed to initialize Firebase Admin SDK.');
  }
}

export const firestore = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
