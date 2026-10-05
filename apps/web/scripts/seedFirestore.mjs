// scripts/seedFirestore.mjs
//
// Isi Firestore dengan data contoh untuk SATU akun yang sudah terdaftar
// (daftar dulu lewat halaman /login), dan opsional jadikan akun itu admin.
//
//   npm run seed -- <uid>                 # lahan & skenario contoh
//   npm run seed -- <uid> --admin         # + custom claim admin & peringatan contoh
//
// uid bisa dilihat di Firebase Console -> Authentication -> Users.
// Kredensial dibaca dari .env.local (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
// FIREBASE_PRIVATE_KEY) lewat flag --env-file di package.json.
import { cert, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { FieldValue, getFirestore } from "firebase-admin/firestore"

const [uid, ...flags] = process.argv.slice(2)
if (!uid) {
  console.error("Pemakaian: npm run seed -- <uid> [--admin]")
  process.exit(1)
}

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env
// Emulator lokal (FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST) tidak butuh service account.
const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST)

if (usingEmulator) {
  if (!FIREBASE_PROJECT_ID) {
    console.error("FIREBASE_PROJECT_ID wajib di-set (mis. demo-ecosentra) saat memakai emulator.")
    process.exit(1)
  }
} else if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error("FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, dan FIREBASE_PRIVATE_KEY wajib di-set di .env.local.")
  process.exit(1)
}

const app = usingEmulator
  ? initializeApp({ projectId: FIREBASE_PROJECT_ID })
  : initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    })
const db = getFirestore(app)
const auth = getAuth(app)

const now = () => FieldValue.serverTimestamp()

const fields = [
  {
    name: "Sawah Irigasi Subang",
    cropType: "Padi",
    areaHa: 12.5,
    plantingDate: "2026-08-20",
    location: { lat: -6.4547, lng: 107.6766 },
    notes: "Lahan contoh — sawah irigasi teknis di pantura Jawa Barat.",
  },
  {
    name: "Kebun Sawit Kampar",
    cropType: "Kelapa sawit",
    areaHa: 85,
    plantingDate: "2019-03-01",
    location: { lat: 0.3329, lng: 101.0389 },
    notes: "Lahan contoh — kebun sawit rakyat di Riau, rawan kebakaran gambut.",
  },
  {
    name: "Kebun Kopi Toraja",
    cropType: "Kopi",
    areaHa: 4,
    plantingDate: "2021-11-15",
    location: { lat: -2.9681, lng: 119.9036 },
    notes: "Lahan contoh — kopi arabika dataran tinggi Sulawesi Selatan.",
  },
]

const scenarios = [
  {
    title: "Pencegahan kebakaran lahan gambut musim kemarau",
    description: "Patroli titik api harian & pembasahan kanal di sekitar kebun sawit Kampar.",
    category: "kebencanaan",
    status: "berjalan",
    priority: "tinggi",
    location: { lat: 0.3329, lng: 101.0389 },
    deadline: "2026-11-30",
  },
  {
    title: "Rotasi padi–palawija untuk efisiensi air",
    description: "Uji rotasi padi–kedelai di sawah Subang saat debit irigasi menurun.",
    category: "pertanian",
    status: "draf",
    priority: "sedang",
    location: { lat: -6.4547, lng: 107.6766 },
    deadline: "2027-02-28",
  },
]

async function main() {
  const user = await auth.getUser(uid) // gagal jelas kalau uid tidak terdaftar
  console.log(`Seeding untuk ${user.email ?? uid}...`)

  await db.collection("users").doc(uid).set(
    { displayName: user.displayName ?? user.email?.split("@")[0] ?? "Pengguna", organization: "", email: user.email ?? null, updatedAt: now() },
    { merge: true },
  )

  for (const field of fields) {
    await db.collection("fields").add({ ...field, userId: uid, lastAnalysis: null, createdAt: now(), updatedAt: now() })
  }
  for (const scenario of scenarios) {
    await db.collection("decisions").add({ ...scenario, userId: uid, createdAt: now(), updatedAt: now() })
  }
  console.log(`✓ ${fields.length} lahan & ${scenarios.length} skenario ditambahkan.`)

  if (flags.includes("--admin")) {
    await auth.setCustomUserClaims(uid, { ...(user.customClaims ?? {}), admin: true })
    await db.collection("alerts").add({
      type: "kebakaran",
      severity: "tinggi",
      title: "Siaga karhutla Kalimantan Tengah (contoh)",
      description: "Peringatan contoh dari admin. Pantau titik api di peta dan koordinasikan dengan BPBD setempat.",
      location: { lat: -2.2136, lng: 113.9108 },
      regionName: "Kalimantan Tengah",
      status: "aktif",
      createdBy: uid,
      createdAt: now(),
    })
    console.log("✓ Akun dijadikan admin (login ulang supaya token baru berlaku) & 1 peringatan contoh dibuat.")
  }
}

main().catch((error) => {
  console.error("Seeding gagal:", error instanceof Error ? error.message : error)
  process.exit(1)
})
