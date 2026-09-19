import { beforeEach, describe, expect, it } from "vitest"
import { cookieStorage, parseCookieHeader, recordFromCookieHeader } from "./cookie.js"
import { definePolicy } from "./policy.js"
import { createConsentStore } from "./store.js"

const policy = definePolicy({ version: "1", categories: [{ id: "analytics" }] })

beforeEach(() => {
  document.cookie = "rogati.consent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"
})

describe("the cookie header", () => {
  it("parses names and decoded values", () => {
    const parsed = parseCookieHeader("a=1; b=%7B%22x%22%3A1%7D; junk; c=")
    expect(parsed.get("a")).toBe("1")
    expect(parsed.get("b")).toBe('{"x":1}')
    expect(parsed.get("c")).toBe("")
    expect(parsed.has("junk")).toBe(false)
  })

  it("yields a record a server can seed a store with", () => {
    const header =
      "other=1; rogati.consent=" +
      encodeURIComponent(
        JSON.stringify({ version: "1", decidedAt: "2026-01-01T00:00:00.000Z", granted: ["analytics"], via: "banner" }),
      )
    const record = recordFromCookieHeader(header)
    expect(record?.granted).toEqual(["analytics"])
    expect(recordFromCookieHeader(null)).toBeNull()
    expect(recordFromCookieHeader("rogati.consent=nonsense")).toBeNull()

    const store = createConsentStore({ policy, environment: "server", seed: record })
    expect(store.allows("analytics")).toBe(true)
    expect(store.getServerState().resolved).toBe(true)
    expect(store.getServerState().needsDecision).toBe(false)
  })
})

describe("cookie-backed storage", () => {
  it("round-trips a value through document.cookie", () => {
    const storage = cookieStorage()
    expect(storage.write("rogati.consent", '{"a":1}')).toBe(true)
    expect(document.cookie).toContain("rogati.consent=%7B%22a%22%3A1%7D")
    expect(storage.read("rogati.consent")).toBe('{"a":1}')
    storage.remove("rogati.consent")
    expect(storage.read("rogati.consent")).toBeNull()
  })

  it("works as the store's storage", () => {
    createConsentStore({ policy, environment: "browser", storage: cookieStorage() }).acceptAll()
    const next = createConsentStore({ policy, environment: "browser", storage: cookieStorage() })
    expect(next.allows("analytics")).toBe(true)
    expect(localStorage.length).toBe(0)
  })
})
