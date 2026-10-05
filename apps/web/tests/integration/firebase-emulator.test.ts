/**
 * Uji integrasi dengan Firebase Admin SDK ASLI terhadap emulator Auth + Firestore.
 * Melengkapi tests/api/* (yang memakai Firestore palsu di memori) dengan
 * memverifikasi perilaku Firestore sungguhan: query, urutan, batch, Timestamp,
 * verifikasi ID token, custom claim admin, hapus akun, dan firestore.rules.
 *
 * Dilewati otomatis kalau emulator tidak berjalan. Jalankan:
 *   npx firebase-tools emulators:exec --config firebase.emulators.json \
 *     --only auth,firestore --project demo-ecosentra \
 *     "FIREBASE_PROJECT_ID=demo-ecosentra npm run test:emulator --prefix apps/web"
 */
import { beforeAll, describe, expect, it, vi } from "vitest"
import { apiRequest, params } from "../helpers/fakeFirebase"

const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST
const PROJECT = process.env.FIREBASE_PROJECT_ID
const enabled = Boolean(FIRESTORE_HOST && AUTH_HOST && PROJECT)

vi.mock("@/server/sources/landcover", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/sources/landcover")>()),
  analyzeLandCover: vi.fn(async (lat: number, lng: number, bufferMeters: number) => ({
    source: { name: "Esri", url: "https://example.test", dataset: "Sentinel-2 10m LULC", year: 2025, resolutionM: 10, fetchedAt: "2026-10-05T00:00:00.000Z" },
    lat,
    lng,
    bufferMeters,
    areaHa: 3,
    dominantClass: "Tanaman pertanian",
    classes: [{ code: 5, name: "Tanaman pertanian", color: "#e49635", percentage: 100 }],
  })),
}))

const run = Date.now().toString(36)

interface TestUser {
  uid: string
  email: string
  token: string
}

async function createUser(name: string): Promise<TestUser> {
  const email = `${name}-${run}@example.com`
  const response = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "rahasia-123", returnSecureToken: true }),
  })
  const body = (await response.json()) as { localId: string; idToken: string }
  return { uid: body.localId, email, token: body.idToken }
}

async function signIn(email: string): Promise<string> {
  const response = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "rahasia-123", returnSecureToken: true }),
  })
  return ((await response.json()) as { idToken: string }).idToken
}

const validField = {
  name: "Sawah Subang",
  cropType: "Padi",
  areaHa: 2.5,
  plantingDate: "2026-09-01",
  location: { lat: -6.5714, lng: 107.7638 },
}

describe.skipIf(!enabled)("Firebase emulator (Admin SDK asli)", () => {
  let alice: TestUser
  let bob: TestUser
  let admin: TestUser
  let fieldsRoute: typeof import("@/app/api/fields/route")
  let fieldRoute: typeof import("@/app/api/fields/[id]/route")
  let analyzeRoute: typeof import("@/app/api/fields/[id]/analyze/route")
  let snapshotsRoute: typeof import("@/app/api/landCoverSnapshots/route")
  let decisionsRoute: typeof import("@/app/api/decisions/route")
  let profileRoute: typeof import("@/app/api/profile/route")
  let alertsRoute: typeof import("@/app/api/alerts/route")
  let alertRoute: typeof import("@/app/api/alerts/[id]/route")
  let adminSdk: typeof import("@/server/firebaseAdmin")

  beforeAll(async () => {
    fieldsRoute = await import("@/app/api/fields/route")
    fieldRoute = await import("@/app/api/fields/[id]/route")
    analyzeRoute = await import("@/app/api/fields/[id]/analyze/route")
    snapshotsRoute = await import("@/app/api/landCoverSnapshots/route")
    decisionsRoute = await import("@/app/api/decisions/route")
    profileRoute = await import("@/app/api/profile/route")
    alertsRoute = await import("@/app/api/alerts/route")
    alertRoute = await import("@/app/api/alerts/[id]/route")
    adminSdk = await import("@/server/firebaseAdmin")
    // Panggilan Firestore pertama per proses memuat SDK + protobuf dan, di luar GCP, mencari
    // kredensial lewat metadata server: bisa beberapa detik. Dipanaskan di sini supaya biaya
    // satu kali itu tidak menghabiskan batas waktu uji pertama.
    await adminSdk.getDb().collection("_warmup").limit(1).get()
    ;[alice, bob, admin] = await Promise.all([createUser("alice"), createUser("bob"), createUser("admin")])
  }, 60_000)

  it("verifikasi ID token sungguhan: tanpa/ salah token 401, token valid lolos", async () => {
    expect((await fieldsRoute.GET(apiRequest("/api/fields"))).status).toBe(401)
    expect((await fieldsRoute.GET(apiRequest("/api/fields", { token: "bukan-token" }))).status).toBe(401)
    const ok = await fieldsRoute.GET(apiRequest("/api/fields", { token: alice.token }))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual([])
  })

  it("CRUD lahan di Firestore sungguhan: Timestamp -> ISO, isolasi, 404 untuk milik orang lain", async () => {
    const created = await (await fieldsRoute.POST(apiRequest("/api/fields", { token: alice.token, method: "POST", body: validField }))).json()
    expect(created).toMatchObject({ ...validField, notes: "", lastAnalysis: null })
    expect(created).not.toHaveProperty("userId")
    expect(new Date(created.createdAt).toString()).not.toBe("Invalid Date") // serverTimestamp -> string ISO

    await fieldsRoute.POST(apiRequest("/api/fields", { token: bob.token, method: "POST", body: { ...validField, name: "Kebun Bob" } }))
    const aliceList = await (await fieldsRoute.GET(apiRequest("/api/fields", { token: alice.token }))).json()
    expect(aliceList.map((f: { name: string }) => f.name)).toEqual(["Sawah Subang"])

    const { id } = created
    expect((await fieldRoute.GET(apiRequest(`/api/fields/${id}`, { token: bob.token }), params({ id }))).status).toBe(404)
    const patched = await (
      await fieldRoute.PATCH(apiRequest(`/api/fields/${id}`, { token: alice.token, method: "PATCH", body: { name: "Sawah Subang Blok A" } }), params({ id }))
    ).json()
    expect(patched.name).toBe("Sawah Subang Blok A")
    expect(Date.parse(patched.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created.updatedAt))
  })

  it("analisis lahan menyimpan snapshot; menghapus lahan menghapus snapshot-nya (query + batch asli)", async () => {
    const [{ id }] = await (await fieldsRoute.GET(apiRequest("/api/fields", { token: alice.token }))).json()
    const analyzed = await analyzeRoute.POST(apiRequest(`/api/fields/${id}/analyze`, { token: alice.token, method: "POST" }), params({ id }))
    expect(analyzed.status).toBe(201)

    const snapshots = await (await snapshotsRoute.GET(apiRequest(`/api/landCoverSnapshots?fieldId=${id}`, { token: alice.token }))).json()
    expect(snapshots).toHaveLength(1)
    expect(snapshots[0]).toMatchObject({ fieldId: id, dominantClass: "Tanaman pertanian", bufferMeters: 100 })

    const field = await (await fieldRoute.GET(apiRequest(`/api/fields/${id}`, { token: alice.token }), params({ id }))).json()
    expect(field.lastAnalysis.dominantClass).toBe("Tanaman pertanian")

    expect((await fieldRoute.DELETE(apiRequest(`/api/fields/${id}`, { token: alice.token, method: "DELETE" }), params({ id }))).status).toBe(204)
    expect(await (await snapshotsRoute.GET(apiRequest("/api/landCoverSnapshots", { token: alice.token }))).json()).toEqual([])
  })

  it("skenario keputusan dan profil", async () => {
    const scenario = await (
      await decisionsRoute.POST(
        apiRequest("/api/decisions", { token: alice.token, method: "POST", body: { title: "Restorasi mangrove", category: "konservasi", location: { lat: -6.9, lng: 110.4 } } }),
      )
    ).json()
    expect(scenario).toMatchObject({ status: "draf", priority: "sedang", location: { lat: -6.9, lng: 110.4 } })

    const profile = await (await profileRoute.PUT(apiRequest("/api/profile", { token: alice.token, method: "PUT", body: { displayName: "Alice", organization: "KLHK" } }))).json()
    expect(profile).toMatchObject({ uid: alice.uid, email: alice.email, displayName: "Alice", organization: "KLHK", isAdmin: false })
    expect((await profileRoute.PUT(apiRequest("/api/profile", { token: alice.token, method: "PUT", body: { displayName: "A", isAdmin: true } }))).status).toBe(400)
  })

  it("peringatan: admin lewat custom claim, publik bisa baca terurut terbaru dulu", async () => {
    const body = { type: "banjir", severity: "tinggi", title: "Banjir Bandung", regionName: "Kab. Bandung", location: { lat: -7, lng: 107.6 } }

    expect((await alertsRoute.POST(apiRequest("/api/alerts", { token: admin.token, method: "POST", body }))).status).toBe(403)

    await adminSdk.getAdminAuth().setCustomUserClaims(admin.uid, { admin: true })
    const adminToken = await signIn(admin.email) // token baru memuat claim
    const first = await alertsRoute.POST(apiRequest("/api/alerts", { token: adminToken, method: "POST", body }))
    expect(first.status).toBe(201)
    await new Promise((resolve) => setTimeout(resolve, 20))
    await alertsRoute.POST(apiRequest("/api/alerts", { token: adminToken, method: "POST", body: { ...body, title: "Longsor Garut", type: "longsor" } }))

    const list = await (await alertsRoute.GET()).json()
    expect(list.configured).toBe(true)
    expect(list.alerts.map((a: { title: string }) => a.title)).toEqual(["Longsor Garut", "Banjir Bandung"])
    expect(list.alerts[0]).not.toHaveProperty("createdBy")

    const { id } = list.alerts[0]
    const updated = await (await alertRoute.PATCH(apiRequest(`/api/alerts/${id}`, { token: adminToken, method: "PATCH", body: { status: "selesai" } }), params({ id }))).json()
    expect(updated.status).toBe("selesai")
    expect((await alertRoute.DELETE(apiRequest(`/api/alerts/${id}`, { token: adminToken, method: "DELETE" }), params({ id }))).status).toBe(204)
    expect((await alertRoute.DELETE(apiRequest(`/api/alerts/${id}`, { token: adminToken, method: "DELETE" }), params({ id }))).status).toBe(404)
  })

  it("hapus akun: semua data milik user hilang, data user lain utuh, akun Auth terhapus", async () => {
    await fieldsRoute.POST(apiRequest("/api/fields", { token: alice.token, method: "POST", body: { ...validField, name: "Kebun kedua" } }))
    const bobFields = await (await fieldsRoute.GET(apiRequest("/api/fields", { token: bob.token }))).json()
    expect(bobFields).toHaveLength(1)

    expect((await profileRoute.DELETE(apiRequest("/api/profile", { token: alice.token, method: "DELETE" }))).status).toBe(204)

    await expect(adminSdk.getAdminAuth().getUser(alice.uid)).rejects.toMatchObject({ code: "auth/user-not-found" })
    const db = adminSdk.getDb()
    for (const collection of ["fields", "decisions", "landCoverSnapshots"]) {
      expect((await db.collection(collection).where("userId", "==", alice.uid).get()).empty, collection).toBe(true)
    }
    expect((await db.collection("users").doc(alice.uid).get()).exists).toBe(false)
    expect(await (await fieldsRoute.GET(apiRequest("/api/fields", { token: bob.token }))).json()).toHaveLength(1)
  })

  it("firestore.rules menolak akses klien langsung (REST tanpa Admin SDK)", async () => {
    const base = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT}/databases/(default)/documents`
    for (const collection of ["fields", "users", "decisions", "alerts"]) {
      const read = await fetch(`${base}/${collection}`)
      expect(read.status, `baca ${collection}`).toBe(403)
      const write = await fetch(`${base}/${collection}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { x: { stringValue: "y" } } }),
      })
      expect(write.status, `tulis ${collection}`).toBe(403)
    }
  })
})
