import { describe, expect, it } from "vitest"
import { safeNextPath } from "@/lib/redirect"

describe("safeNextPath", () => {
  it("menerima path relatif internal", () => {
    expect(safeNextPath("/fields")).toBe("/fields")
    expect(safeNextPath("/maps?lat=-2&lng=113&sel=1")).toBe("/maps?lat=-2&lng=113&sel=1")
  })

  it("menolak URL absolut, protocol-relative, dan trik backslash", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "evil.com", "/ok\nSet-Cookie: x=1"]) {
      expect(safeNextPath(bad), bad).toBe("/dashboard")
    }
  })

  it("memakai fallback saat kosong", () => {
    expect(safeNextPath(null)).toBe("/dashboard")
    expect(safeNextPath("", "/")).toBe("/")
  })
})
