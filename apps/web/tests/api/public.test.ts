import { readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearCache } from "@/server/cache"
import { resetRateLimits } from "@/server/rateLimit"
import { apiRequest, fakeDb, firebaseState } from "../helpers/fakeFirebase"

vi.mock("@/server/firebaseAdmin", async () => (await import("../helpers/fakeFirebase")).fakeFirebaseAdminModule())

const hotspotsRoute = await import("@/app/api/hotspots/route")
const summaryRoute = await import("@/app/api/hotspots/summary/route")
const exportRoute = await import("@/app/api/hotspots/export/route")
const weatherRoute = await import("@/app/api/weather/route")
const alertsRoute = await import("@/app/api/alerts/route")
const healthRoute = await import("@/app/api/healthcheck/route")

const firmsCsv = readFileSync(new URL("../fixtures/firms-sample.csv", import.meta.url), "utf8")

beforeEach(() => {
  fakeDb.reset()
  firebaseState.configured = true
  vi.stubGlobal("fetch", vi.fn(async () => new Response(firmsCsv)))
})

afterEach(() => {
  vi.unstubAllGlobals()
  clearCache()
  resetRateLimits()
})

describe("/api/hotspots", () => {
  it("mengembalikan ringkasan + titik ringkas", async () => {
    const res = await hotspotsRoute.GET(apiRequest("/api/hotspots?range=24h"))
    expect(res.status).toBe(200)
    expect(res.headers.get("cache-control")).toContain("s-maxage")
    const body = await res.json()
    expect(body.total).toBe(5)
    expect(body.points[0]).toEqual([-3.42111, 114.79005, 10.2, 0, Date.parse("2026-10-04T05:46:00Z") / 1000, "ID-KS"])
  })

  it("memfilter per provinsi dan menolak 7d nasional", async () => {
    const body = await (await hotspotsRoute.GET(apiRequest("/api/hotspots?range=24h&province=ID-PA"))).json()
    expect(body.total).toBe(2)
    expect(body.byProvince).toHaveLength(1)

    const res = await hotspotsRoute.GET(apiRequest("/api/hotspots?range=7d"))
    expect(res.status).toBe(400)
  })

  it("menerima nama provinsi & singkatan, bukan hanya kode ISO", async () => {
    const byIso = await (await hotspotsRoute.GET(apiRequest("/api/hotspots?range=24h&province=ID-PA"))).json()
    for (const alias of ["Papua", "papua", "Provinsi%20Papua"]) {
      const byName = await (await hotspotsRoute.GET(apiRequest(`/api/hotspots?range=24h&province=${alias}`))).json()
      expect(byName.total, alias).toBe(byIso.total)
    }
    // endpoint ringkasan memakai skema yang sama (singkatan "sumsel" = Sumatera Selatan, 2 titik di fixture)
    const sumsel = await (await summaryRoute.GET(apiRequest("/api/hotspots/summary?range=24h&province=sumsel"))).json()
    expect(sumsel.total).toBe(2)
    expect(sumsel.byProvince[0].iso).toBe("ID-SS")
  })

  it("memvalidasi parameter", async () => {
    expect((await hotspotsRoute.GET(apiRequest("/api/hotspots?range=1y"))).status).toBe(400)
    const unknown = await hotspotsRoute.GET(apiRequest("/api/hotspots?province=Atlantis"))
    expect(unknown.status).toBe(400)
    expect((await unknown.json()).error).toMatch(/province tidak dikenali/)
  })
})

describe("/api/hotspots/export", () => {
  it("menghasilkan GeoJSON, CSV, dan KML sebagai file unduhan", async () => {
    const geojson = await exportRoute.GET(apiRequest("/api/hotspots/export?range=24h&format=geojson"))
    expect(geojson.headers.get("content-disposition")).toMatch(/attachment; filename="titik-api_24h_\d{4}-\d{2}-\d{2}\.geojson"/)
    const collection = await geojson.json()
    expect(collection.type).toBe("FeatureCollection")
    expect(collection.features).toHaveLength(5)
    expect(collection.features[0].geometry.coordinates).toEqual([114.79005, -3.42111])

    const csv = await (await exportRoute.GET(apiRequest("/api/hotspots/export?format=csv"))).text()
    expect(csv.split("\n")[0]).toBe(
      "latitude,longitude,acquired_at_utc,confidence,frp_mw,brightness_k,daynight,province,province_iso,island",
    )
    expect(csv.trim().split("\n")).toHaveLength(6)

    const kml = await (await exportRoute.GET(apiRequest("/api/hotspots/export?format=kml&province=ID-SS"))).text()
    expect(kml).toContain("<kml")
    expect(kml.match(/<Placemark>/g)).toHaveLength(2)
  })
})

describe("/api/weather", () => {
  it("menolak koordinat di luar Indonesia", async () => {
    const res = await weatherRoute.GET(apiRequest("/api/weather?lat=51.5&lng=-0.12"))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/wilayah Indonesia/)
  })

  it("membatasi jumlah request per IP (429)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(readFileSync(new URL("../fixtures/open-meteo.json", import.meta.url), "utf8"))),
    )
    const request = () =>
      weatherRoute.GET(
        new Request("http://localhost/api/weather?lat=-6.2&lng=106.8", { headers: { "x-forwarded-for": "1.2.3.4" } }),
      )
    for (let i = 0; i < 30; i++) expect((await request()).status).toBe(200)
    const limited = await request()
    expect(limited.status).toBe(429)
    expect(limited.headers.get("retry-after")).toBeTruthy()
  })
})

describe("/api/alerts", () => {
  const alert = {
    type: "banjir",
    severity: "tinggi",
    title: "Banjir Kabupaten Bandung",
    location: { lat: -7.0, lng: 107.6 },
    regionName: "Kab. Bandung, Jawa Barat",
  }

  it("hanya admin yang boleh membuat peringatan, semua orang boleh membaca", async () => {
    const asUser = await alertsRoute.POST(apiRequest("/api/alerts", { token: "token-alice", method: "POST", body: alert }))
    expect(asUser.status).toBe(403)

    const asAdmin = await alertsRoute.POST(apiRequest("/api/alerts", { token: "token-admin", method: "POST", body: alert }))
    expect(asAdmin.status).toBe(201)

    const list = await (await alertsRoute.GET()).json()
    expect(list.configured).toBe(true)
    expect(list.alerts).toHaveLength(1)
    expect(list.alerts[0]).toMatchObject({ ...alert, status: "aktif", description: "" })
    expect(list.alerts[0]).not.toHaveProperty("createdBy")
  })

  it("tetap 200 dengan daftar kosong kalau Firebase belum dikonfigurasi", async () => {
    firebaseState.configured = false
    const res = await alertsRoute.GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ configured: false, alerts: [] })
  })
})

describe("/api/healthcheck", () => {
  it("melaporkan status integrasi tanpa nilai rahasia", async () => {
    const body = await (await healthRoute.GET()).json()
    expect(body.status).toBe("ok")
    expect(Object.values(body.integrations).every((v) => typeof v === "boolean")).toBe(true)
  })
})
