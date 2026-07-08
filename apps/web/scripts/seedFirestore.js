// scripts/seedFirestore.js
require('dotenv').config({ path: '../.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
    });
  }
  console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  process.exit(1);
}

const db = admin.firestore();
const { GeoPoint, Timestamp, FieldValue } = admin.firestore;

// --- Helper Functions ---
const getAdminRef = () => db.doc('users/admin');
const getFirstFieldRef = async () => {
  const fields = await db.collection('fields').limit(1).get();
  if (fields.empty) return null;
  return fields.docs[0].ref;
};

// --- Seeding Functions ---

async function seedUsers() {
  const adminRef = getAdminRef();
  const doc = await adminRef.get();

  if (!doc.exists) {
    console.log('No admin user found. Seeding admin...');
    await adminRef.set({
      name: 'EcoSentra Admin',
      email: 'admin@ecosentra.com',
      role: 'admin',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('Admin user seeded.');
  } else {
    console.log('Admin user already exists.');
  }
}

async function seedFields() {
  const fieldsRef = db.collection('fields');
  const snapshot = await fieldsRef.limit(1).get();

  if (snapshot.empty) {
    console.log('Seeding fields...');
    await fieldsRef.add({
      name: 'Sample Farm Field',
      ownerRef: getAdminRef(),
      geometry: new GeoPoint(-6.2, 106.8), // Jakarta
      healthScore: 85.5,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('Fields seeded.');
  } else {
    console.log('Fields collection already has data.');
  }
}

async function seedLandCoverSnapshots() {
  const snapshotsRef = db.collection('landCoverSnapshots');
  const snapshot = await snapshotsRef.limit(1).get();

  if (snapshot.empty) {
    console.log('Seeding land cover snapshots...');
    const fieldRef = await getFirstFieldRef();
    if (fieldRef) {
      await snapshotsRef.add({
        fieldRef: fieldRef,
        date: Timestamp.fromDate(new Date('2024-05-20')),
        ndvi: 0.78,
        carbonStock: 120.3,
        source: 'Sentinel-2',
      });
      console.log('Land cover snapshots seeded.');
    } else {
      console.log('No fields found to associate snapshot with.');
    }
  } else {
    console.log('LandCoverSnapshots collection already has data.');
  }
}

async function seedAlerts() {
  const alertsRef = db.collection('alerts');
  const snapshot = await alertsRef.limit(1).get();

  if (snapshot.empty) {
    console.log('Seeding alerts...');
    await alertsRef.add({
      type: 'fire',
      location: new GeoPoint(-7.5, 110.4), // Central Java
      status: 'active',
      severity: 'high',
      timestamp: FieldValue.serverTimestamp(),
    });
    console.log('Alerts seeded.');
  } else {
    console.log('Alerts collection already has data.');
  }
}

async function seedEcoServicesMetrics() {
    const metricsRef = db.collection('ecoServicesMetrics');
    const snapshot = await metricsRef.limit(1).get();
    if(snapshot.empty) {
        console.log('Seeding eco-services metrics...');
        const fieldRef = await getFirstFieldRef();
        if(fieldRef) {
            await metricsRef.add({
                fieldRef: fieldRef,
                metricType: 'carbon_sequestration',
                value: 15.7, // tons/ha/year
                lastCalculated: FieldValue.serverTimestamp()
            });
            console.log('Eco-services metrics seeded.');
        } else {
            console.log('No fields found to associate metrics with.');
        }
    } else {
        console.log('EcoServicesMetrics collection already has data.');
    }
}

async function seedDecisions() {
    const decisionsRef = db.collection('decisions');
    const snapshot = await decisionsRef.limit(1).get();
    if(snapshot.empty) {
        console.log('Seeding decisions...');
        const fieldRef = await getFirstFieldRef();
        if(fieldRef) {
            await decisionsRef.add({
                ownerRef: getAdminRef(),
                fieldRef: fieldRef,
                decision: 'Implement precision agriculture techniques based on recent NDVI drop.',
                status: 'recommended',
                createdAt: FieldValue.serverTimestamp(),
            });
            console.log('Decisions seeded.');
        } else {
            console.log('No fields found to associate a decision with.');
        }
    } else {
        console.log('Decisions collection already has data.');
    }
}

async function seedExportRequests() {
    const exportsRef = db.collection('exportRequests');
    const snapshot = await exportsRef.limit(1).get();
    if(snapshot.empty) {
        console.log('Seeding export requests...');
        await exportsRef.add({
            ownerRef: getAdminRef(),
            format: 'GeoJSON',
            status: 'completed',
            downloadUrl: 'https://storage.googleapis.com/ecosentra-exports/export-123.geojson',
            createdAt: FieldValue.serverTimestamp(),
        });
        console.log('Export requests seeded.');
    } else {
        console.log('ExportRequests collection already has data.');
    }
}

async function seedChatSessions() {
    const chatRef = db.collection('chatSessions');
    const snapshot = await chatRef.limit(1).get();
    if(snapshot.empty) {
        console.log('Seeding chat sessions...');
        const newSessionRef = chatRef.doc();
        await newSessionRef.set({
            ownerRef: getAdminRef(),
            startTime: FieldValue.serverTimestamp(),
            title: "Analisis Hutan & Deforestasi"
        });

        const messagesRef = newSessionRef.collection('messages');
        await messagesRef.add({
            sender: 'user',
            text: 'Berapa luas hutan di Indonesia?',
            timestamp: FieldValue.serverTimestamp()
        });
        await messagesRef.add({
            sender: 'ai',
            text: '🌲 Berdasarkan data terbaru, Indonesia memiliki sekitar 920,000 km² hutan primer dan 340,000 km² hutan sekunder. Hutan Indonesia mengalami tekanan dari deforestasi, namun upaya konservasi terus dilakukan melalui program restorasi dan monitoring satelit real-time.',
            timestamp: FieldValue.serverTimestamp()
        });
         await messagesRef.add({
            sender: 'user',
            text: 'Apa penyebab utama deforestasi?',
            timestamp: FieldValue.serverTimestamp()
        });
        await messagesRef.add({
            sender: 'ai',
            text: '🪓 Penyebab utama deforestasi di Indonesia meliputi: 1) Konversi lahan untuk perkebunan kelapa sawit, 2) Pertanian skala besar, 3) Penebangan ilegal, 4) Pembangunan infrastruktur. Monitoring satelit membantu deteksi dini perubahan tutupan lahan.',
            timestamp: FieldValue.serverTimestamp()
        });
        console.log('Chat sessions seeded.');
    } else {
        console.log('ChatSessions collection already has data.');
    }
}


// --- Main Execution ---

async function main() {
  try {
    console.log('Starting Firestore seeding...');
    await seedUsers();
    await seedFields();
    await seedLandCoverSnapshots();
    await seedAlerts();
    await seedEcoServicesMetrics();
    await seedDecisions();
    await seedExportRequests();
    await seedChatSessions();
    console.log('Firestore seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('An error occurred during seeding:', error);
    process.exit(1);
  }
}

main();
