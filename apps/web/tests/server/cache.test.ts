import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cached, clearCache } from "@/server/cache"

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-10-05T00:00:00Z"))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  clearCache()
})

describe("cached", () => {
  it("memanggil loader sekali selama TTL dan menggabungkan request bersamaan", async () => {
    const loader = vi.fn(async () => "a")
    const [x, y] = await Promise.all([cached("k", 1000, loader), cached("k", 1000, loader)])
    expect(x).toBe("a")
    expect(y).toBe("a")
    await cached("k", 1000, loader)
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it("stale-while-revalidate: menyajikan nilai lama langsung & memperbarui di latar belakang", async () => {
    let version = 1
    const loader = vi.fn(async () => `v${version}`)
    expect(await cached("k", 1000, loader)).toBe("v1")

    version = 2
    vi.advanceTimersByTime(1500) // lewat TTL, belum lewat staleMs (6 x TTL)
    expect(await cached("k", 1000, loader)).toBe("v1") // langsung, tanpa menunggu loader
    await vi.advanceTimersByTimeAsync(0)
    expect(loader).toHaveBeenCalledTimes(2)
    expect(await cached("k", 1000, loader)).toBe("v2") // pembaruan sudah masuk
  })

  it("setelah lewat batas stale, request menunggu loader baru", async () => {
    let version = 1
    const loader = vi.fn(async () => `v${version}`)
    await cached("k", 1000, loader)
    version = 2
    vi.advanceTimersByTime(10_000)
    expect(await cached("k", 1000, loader)).toBe("v2")
  })

  it("kalau pembaruan gagal, tetap memakai nilai lama dan mencoba lagi ≤ 60 detik", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const loader = vi.fn<() => Promise<string>>().mockResolvedValueOnce("v1").mockRejectedValueOnce(new Error("down"))
    await cached("k", 1000, loader)

    vi.advanceTimersByTime(1500)
    expect(await cached("k", 1000, loader)).toBe("v1")
    await vi.advanceTimersByTimeAsync(0)
    expect(warn).toHaveBeenCalled()

    loader.mockResolvedValueOnce("v3")
    vi.advanceTimersByTime(1500)
    expect(await cached("k", 1000, loader)).toBe("v1") // stale lagi, refresh berikutnya jalan
    await vi.advanceTimersByTimeAsync(0)
    expect(await cached("k", 1000, loader)).toBe("v3")
  })

  it("gagal tanpa nilai lama -> melempar error dan tidak menyimpan apa pun", async () => {
    const loader = vi.fn<() => Promise<string>>().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce("ok")
    await expect(cached("k", 1000, loader)).rejects.toThrow("down")
    expect(await cached("k", 1000, loader)).toBe("ok")
  })
})
