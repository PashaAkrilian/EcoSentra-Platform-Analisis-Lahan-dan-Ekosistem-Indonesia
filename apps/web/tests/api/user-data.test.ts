import { beforeEach, describe, expect, it, vi } from "vitest"
import { apiRequest, fakeAuth, fakeDb, firebaseState, params } from "../helpers/fakeFirebase"

vi.mock("@/server/firebaseAdmin", async () => (await import("../helpers/fakeFirebase")).fakeFirebaseAdminModule())
vi.mock("@/server/sources/landcover", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/sources/landcover")>()),
  analyzeLandCover: vi.fn(async (lat: number, lng: number, bufferMeters: number) => ({
    source: {
      name: "Esri | Impact Observatory",
      url: "https://livingatlas.arcgis.com/landcover/",
      dataset: "Sentinel-2 10m Land Use/Land Cover",
      year: 2025,
      resolutionM: 10,
      fetchedAt: "2026-10-05T00:00:00.000Z",
    },
    lat,
    lng,
    bufferMeters,
    areaHa: 3,
    dominantClass: "Tanaman pertanian",
    classes: [{ code: 5, name: "Tanaman pertanian", color: "#e49635", percentage: 100 }],
  })),
}))

const fieldsRoute = await import("@/app/api/fields/route")
const fieldRoute = await import("@/app/api/fields/[id]/route")
const analyzeRoute = await import("@/app/api/fields/[id]/analyze/route")
const snapshotsRoute = await import("@/app/api/landCoverSnapshots/route")
const decisionsRoute = await import("@/app/api/decisions/route")
const decisionRoute = await import("@/app/api/decisions/[id]/route")
const profileRoute = await import("@/app/api/profile/route")

const validField = {
  name: "Sawah Subang",
  cropType: "Padi",
  areaHa: 2.5,
  plantingDate: "2026-09-01",
  location: { lat: -6.5714, lng: 107.7638 },
}

async function createField(token = "token-alice", body: object = validField) {
  const res = await fieldsRoute.POST(apiRequest("/api/fields", { token, method: "POST", body }))
  expect(res.status).toBe(201)
  return res.json()
}

beforeEach(() => {
  fakeDb.reset()
  fakeAuth.deletedUids.length = 0
  firebaseState.configured = true
})

describe("autentikasi", () => {
  it("menolak request tanpa token (401)", async () => {
    const res = await fieldsRoute.GET(apiRequest("/api/fields"))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: "Login diperlukan untuk mengakses data ini." })
  })

  it("menolak token tidak valid (401)", async () => {
    const res = await fieldsRoute.GET(apiRequest("/api/fields", { token: "palsu" }))
    expect(res.status).toBe(401)
  })

  it("mengembalikan 503 kalau Firebase belum dikonfigurasi", async () => {
    firebaseState.configured = false
    const res = await fieldsRoute.GET(apiRequest("/api/fields", { token: "token-alice" }))
    expect(res.status).toBe(503)
    expect((await res.json()).error).toMatch(/belum dikonfigurasi/)
  })
})

describe("/api/fields", () => {
  it("membuat lahan dan hanya menampilkannya ke pemiliknya", async () => {
    const created = await createField()
    expect(created).toMatchObject({ ...validField, notes: "", lastAnalysis: null })
    expect(created.id).toBeTruthy()
    expect(created).not.toHaveProperty("userId")
    expect(typeof created.createdAt).toBe("string")

    await createField("token-bob", { ...validField, name: "Kebun Bob" })

    const aliceList = await (await fieldsRoute.GET(apiRequest("/api/fields", { token: "token-alice" }))).json()
    expect(aliceList.map((f: { name: string }) => f.name)).toEqual(["Sawah Subang"])
  })

  it("memvalidasi body (400) termasuk field tak dikenal & koordinat di luar Indonesia", async () => {
    const cases = [
      {},
      { ...validField, cropType: "Gandum Mars" },
      { ...validField, location: { lat: 48.85, lng: 2.35 } },
      { ...validField, userId: "bob" },
      "bukan json",
    ]
    for (const body of cases) {
      const res = await fieldsRoute.POST(apiRequest("/api/fields", { token: "token-alice", method: "POST", body }))
      expect(res.status, JSON.stringify(body)).toBe(400)
    }
  })

  it("menyembunyikan lahan milik user lain (404) untuk GET/PATCH/DELETE", async () => {
    const { id } = await createField()
    const asBob = { token: "token-bob" }

    expect((await fieldRoute.GET(apiRequest(`/api/fields/${id}`, asBob), params({ id }))).status).toBe(404)
    expect(
      (await fieldRoute.PATCH(apiRequest(`/api/fields/${id}`, { ...asBob, method: "PATCH", body: { name: "x" } }), params({ id })))
        .status,
    ).toBe(404)
    expect((await fieldRoute.DELETE(apiRequest(`/api/fields/${id}`, { ...asBob, method: "DELETE" }), params({ id }))).status).toBe(404)
    expect(fakeDb.store("fields").has(id)).toBe(true)
  })

  it("menganalisis tutupan lahan, menyimpan snapshot, lalu menghapus semuanya bersama lahan", async () => {
    const { id } = await createField()

    const res = await analyzeRoute.POST(apiRequest(`/api/fields/${id}/analyze`, { token: "token-alice", method: "POST" }), params({ id }))
    expect(res.status).toBe(201)
    const snapshot = await res.json()
    // luas 2,5 ha -> radius lingkaran setara ≈ 89 m -> dibatasi minimal 100 m
    expect(snapshot).toMatchObject({ fieldId: id, bufferMeters: 100, dominantClass: "Tanaman pertanian", year: 2025 })

    const field = await (await fieldRoute.GET(apiRequest(`/api/fields/${id}`, { token: "token-alice" }), params({ id }))).json()
    expect(field.lastAnalysis).toMatchObject({ dominantClass: "Tanaman pertanian" })

    const snapshots = await (
      await snapshotsRoute.GET(apiRequest(`/api/landCoverSnapshots?fieldId=${id}`, { token: "token-alice" }))
    ).json()
    expect(snapshots).toHaveLength(1)

    // Lokasi diubah -> analisis lama tidak berlaku
    const patched = await (
      await fieldRoute.PATCH(
        apiRequest(`/api/fields/${id}`, { token: "token-alice", method: "PATCH", body: { location: { lat: -6.6, lng: 107.7 } } }),
        params({ id }),
      )
    ).json()
    expect(patched.lastAnalysis).toBeNull()

    const del = await fieldRoute.DELETE(apiRequest(`/api/fields/${id}`, { token: "token-alice", method: "DELETE" }), params({ id }))
    expect(del.status).toBe(204)
    expect(fakeDb.store("landCoverSnapshots").size).toBe(0)
  })
})

describe("/api/decisions", () => {
  it("CRUD skenario milik sendiri dengan nilai default", async () => {
    const res = await decisionsRoute.POST(
      apiRequest("/api/decisions", {
        token: "token-alice",
        method: "POST",
        body: { title: "Restorasi mangrove", category: "konservasi" },
      }),
    )
    expect(res.status).toBe(201)
    const scenario = await res.json()
    expect(scenario).toMatchObject({ status: "draf", priority: "sedang", location: null, deadline: null })

    const updated = await (
      await decisionRoute.PATCH(
        apiRequest(`/api/decisions/${scenario.id}`, { token: "token-alice", method: "PATCH", body: { status: "berjalan" } }),
        params({ id: scenario.id }),
      )
    ).json()
    expect(updated.status).toBe("berjalan")

    const forbidden = await decisionRoute.DELETE(
      apiRequest(`/api/decisions/${scenario.id}`, { token: "token-bob", method: "DELETE" }),
      params({ id: scenario.id }),
    )
    expect(forbidden.status).toBe(404)
  })
})

describe("/api/profile", () => {
  it("membuat profil default dari token lalu bisa diperbarui", async () => {
    const initial = await (await profileRoute.GET(apiRequest("/api/profile", { token: "token-alice" }))).json()
    expect(initial).toEqual({ uid: "alice", email: "alice@example.com", isAdmin: false, displayName: "alice", organization: "" })

    const updated = await (
      await profileRoute.PUT(
        apiRequest("/api/profile", { token: "token-alice", method: "PUT", body: { displayName: "Alice", organization: "KLHK" } }),
      )
    ).json()
    expect(updated).toMatchObject({ displayName: "Alice", organization: "KLHK", isAdmin: false })
  })

  it("nama default profil memakai klaim `name` dari akun login, lalu awalan email", async () => {
    const carol = await (await profileRoute.GET(apiRequest("/api/profile", { token: "token-carol" }))).json()
    expect(carol.displayName).toBe("Carol Dewi")
    const alice = await (await profileRoute.GET(apiRequest("/api/profile", { token: "token-alice" }))).json()
    expect(alice.displayName).toBe("alice")
  })

  it("tidak bisa menjadikan diri sendiri admin", async () => {
    const res = await profileRoute.PUT(
      apiRequest("/api/profile", { token: "token-alice", method: "PUT", body: { displayName: "A", isAdmin: true } }),
    )
    expect(res.status).toBe(400)
  })
})

describe("DELETE /api/profile (hapus akun & data)", () => {
  it("menghapus semua data milik user saja, lalu akun login-nya", async () => {
    const { id: aliceField } = await createField("token-alice")
    await createField("token-alice", { ...validField, name: "Kebun kedua" })
    const { id: bobField } = await createField("token-bob", { ...validField, name: "Kebun Bob" })
    await analyzeRoute.POST(apiRequest(`/api/fields/${aliceField}/analyze`, { token: "token-alice", method: "POST" }), params({ id: aliceField }))
    await decisionsRoute.POST(
      apiRequest("/api/decisions", { token: "token-alice", method: "POST", body: { title: "Skenario Alice", category: "pertanian" } }),
    )
    await profileRoute.PUT(apiRequest("/api/profile", { token: "token-alice", method: "PUT", body: { displayName: "Alice" } }))

    expect(fakeDb.store("fields").size).toBe(3)

    const res = await profileRoute.DELETE(apiRequest("/api/profile", { token: "token-alice", method: "DELETE" }))
    expect(res.status).toBe(204)

    expect([...fakeDb.store("fields").keys()]).toEqual([bobField])
    expect(fakeDb.store("landCoverSnapshots").size).toBe(0)
    expect(fakeDb.store("decisions").size).toBe(0)
    expect(fakeDb.store("users").has("alice")).toBe(false)
    expect(fakeAuth.deletedUids).toEqual(["alice"])
  })

  it("butuh login", async () => {
    const res = await profileRoute.DELETE(apiRequest("/api/profile", { method: "DELETE" }))
    expect(res.status).toBe(401)
    expect(fakeAuth.deletedUids).toEqual([])
  })
})
