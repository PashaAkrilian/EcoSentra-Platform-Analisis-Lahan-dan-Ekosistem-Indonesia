// scripts/seedFirestore.ts
import { config } from 'dotenv';
import { resolve } from 'path';
import * as admin from 'firebase-admin';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

// --- Environment Variable Validation ---
if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY
) {
  console.error('Missing required Firebase Admin SDK environment variables. Check your .env.local file.');
  process.exit(1);
}

// --- Firebase Admin Initialization ---
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
    process.exit(1);
  }
}

const db = admin.firestore();
const { FieldValue, GeoPoint, Timestamp } = admin.firestore;

// --- Helper Functions ---
const getAdminRef = () => db.doc('users/admin');

const getFirstFieldRef = async () => {
    const fieldsSnapshot = await db.collection('fields').limit(1).get();
    if (fieldsSnapshot.empty) {
        console.log('No fields found. Seeding one first.');
        const newField = await db.collection('fields').add({
            name: 'Primary Demo Field',
            ownerRef: getAdminRef(),
            healthScore: 88,
            createdAt: FieldValue.serverTimestamp(),
        });
        return newField;
    }
    return fieldsSnapshot.docs[0].ref;
};


// --- Seeding Functions ---

async function seedUsers() {
  const adminUserRef = getAdminRef();
  const doc = await adminUserRef.get();
  if (doc.exists) {
      console.log('Admin user already exists.');
      return;
  }
  console.log('Seeding admin user...');
  await adminUserRef.set({
    name: 'EcoSentra Admin',
    email: 'admin@ecosentra.com',
    role: 'admin',
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function seedAlerts() {
    console.log('Seeding alerts...');
    const alertsRef = db.collection('alerts');
    await alertsRef.doc('fire-alert-1').set({
        type: 'fire',
        location: new GeoPoint(-2.5, 118.0), // Central Indonesia
        status: 'active',
        severity: 'high',
        timestamp: FieldValue.serverTimestamp(),
    });
}

async function seedChatSessions() {
    console.log('Seeding chat sessions...');
    const chatRef = db.collection('chatSessions').doc('demo-session-1');
    await chatRef.set({
        ownerRef: getAdminRef(),
        startTime: FieldValue.serverTimestamp(),
        title: "Analisis Penyebab Deforestasi"
    });

    const messagesRef = chatRef.collection('messages');
    await messagesRef.add({
        sender: 'user',
        text: 'Apa penyebab utama deforestasi di Indonesia?',
        timestamp: FieldValue.serverTimestamp()
    });
    await messagesRef.add({
        sender: 'ai',
        text: '🪓 Penyebab utama deforestasi di Indonesia meliputi konversi lahan untuk kelapa sawit, pertanian skala besar, penebangan ilegal, dan pembangunan infrastruktur.',
        timestamp: FieldValue.serverTimestamp()
    });
}

async function seedLandCoverSnapshots() {
    console.log('Seeding land cover snapshots...');
    const fieldRef = await getFirstFieldRef();
    const snapshotRef = db.collection('landCoverSnapshots');
    await snapshotRef.doc('snapshot-1').set({
        fieldRef: fieldRef,
        date: Timestamp.fromDate(new Date()),
        ndvi: 0.81,
        carbonStock: 150.5, // tons/ha
        source: 'Sentinel-2 Cloudless'
    });
}


// --- Main Execution ---

async function seed() {
  try {
    console.log('Starting comprehensive Firestore seeding...');
    
    await seedUsers();
    // No need to seed fields again if it exists, getFirstFieldRef handles it.
    await getFirstFieldRef(); 
    await seedAlerts();
    await seedLandCoverSnapshots();
    await seedChatSessions();
    
    console.log('✅ Firestore has been successfully seeded with comprehensive data.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during Firestore seeding:', error);
    process.exit(1);
  }
}

seed();
