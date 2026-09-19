import { beforeEach, describe, expect, it, vi } from "vitest"
import { consent, deniedGate, installConsentGate } from "./gate.js"
import { NECESSARY, asksAnything, definePolicy } from "./policy.js"
import { parseRecord } from "./record.js"
import { DEFAULT_STORAGE_KEY, createConsentStore } from "./store.js"
import { guarded, memoryStorage, type ConsentStorage } from "./storage.js"

const policy = definePolicy({
  version: "2026-09-01",
  categories: [{ id: "analytics" }],
})

function storedKeys(): string[] {
  return Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)!)
}

function browserStore(over: Partial<Parameters<typeof createConsentStore>[0]> = {}) {
  return createConsentStore({ policy, environment: "browser", ...over })
}

describe("the gate is denied by default", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("refuses every category before a store exists", () => {
    expect(consent()).toBe(deniedGate)
    for (const category of ["analytics", "marketing", "anything-at-all"]) {
      expect(consent().allows(category)).toBe(false)
      expect(consent().status(category)).toBe("unknown")
    }
    expect(consent().record()).toBeNull()
  })

  it("allows the necessary category with no decision at all", () => {
    expect(deniedGate.allows(NECESSARY)).toBe(true)
    expect(deniedGate.status(NECESSARY)).toBe("granted")
  })

  it("refuses a declared category until somebody decides", () => {
    const store = browserStore()
    expect(store.allows("analytics")).toBe(false)
    expect(store.status("analytics")).toBe("unknown")
    expect(store.getState().needsDecision).toBe(true)
  })

  it("puts the denied gate back when a store is uninstalled", () => {
    const store = browserStore()
    const uninstall = installConsentGate(store)
    store.acceptAll()
    expect(consent().allows("analytics")).toBe(true)
    uninstall()
    expect(consent().allows("analytics")).toBe(false)
  })

  it("refuses a category nobody declared even after accepting everything", () => {
    const store = browserStore()
    store.acceptAll()
    expect(store.allows("analytics")).toBe(true)
    expect(store.allows("advertising")).toBe(false)
  })
})

describe("rejecting", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("stores nothing but the record itself", () => {
    const store = browserStore()
    store.rejectAll()

    expect(storedKeys()).toEqual([DEFAULT_STORAGE_KEY])

    const record = parseRecord(localStorage.getItem(DEFAULT_STORAGE_KEY))
    expect(record?.granted).toEqual([])
    expect(record?.version).toBe(policy.version)
    expect(document.cookie).toBe("")

    expect(store.allows("analytics")).toBe(false)
    expect(store.status("analytics")).toBe("denied")
    expect(store.getState().needsDecision).toBe(false)
  })

  it("writes only a version, a timestamp, a list and where it was asked", () => {
    const store = browserStore({ now: () => new Date("2026-09-18T10:00:00.000Z") })
    store.rejectAll()
    expect(JSON.parse(localStorage.getItem(DEFAULT_STORAGE_KEY)!)).toEqual({
      version: "2026-09-01",
      decidedAt: "2026-09-18T10:00:00.000Z",
      granted: [],
      via: "banner",
    })
  })

  it("does not ask again on the next page load", () => {
    browserStore().rejectAll()
    const second = browserStore()
    expect(second.getState().needsDecision).toBe(false)
    expect(second.allows("analytics")).toBe(false)
  })

  it("takes a grant back and refuses from that moment", () => {
    const store = browserStore()
    store.acceptAll()
    expect(store.allows("analytics")).toBe(true)
    store.save([], "preferences")
    expect(store.allows("analytics")).toBe(false)
    expect(store.record()?.via).toBe("preferences")
  })
})

describe("the policy version", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("re-asks when the policy moves on, and refuses in the meantime", () => {
    browserStore().acceptAll()
    expect(browserStore().allows("analytics")).toBe(true)

    const grown = definePolicy({
      version: "2026-10-01",
      categories: [{ id: "analytics" }, { id: "support-chat" }],
    })
    const after = createConsentStore({ policy: grown, environment: "browser" })
    expect(after.getState().needsDecision).toBe(true)
    expect(after.allows("analytics")).toBe(false)
    expect(after.allows("support-chat")).toBe(false)
  })

  it("keeps the answer while the version holds", () => {
    browserStore().acceptAll()
    const same = browserStore()
    expect(same.getState().needsDecision).toBe(false)
    expect(same.allows("analytics")).toBe(true)
  })
})

describe("signals the browser already sent", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it.each(["globalPrivacyControl", "doNotTrack"] as const)("treats %s as a refusal", (signal) => {
    const store = browserStore({ signals: [signal] })
    expect(store.allows("analytics")).toBe(false)
    expect(store.status("analytics")).toBe("denied")
  })

  it("does not show the banner", () => {
    const store = browserStore({ signals: ["globalPrivacyControl"] })
    expect(store.getState().needsDecision).toBe(false)
    expect(store.getState().signals).toEqual(["globalPrivacyControl"])
  })

  it("writes nothing", () => {
    browserStore({ signals: ["doNotTrack"] })
    expect(storedKeys()).toEqual([])
  })

  it("lets an explicit grant in the dialog override the signal", () => {
    const store = browserStore({ signals: ["globalPrivacyControl"] })
    store.save(["analytics"], "preferences")
    expect(store.allows("analytics")).toBe(true)
  })
})

describe("a site with nothing to ask about", () => {
  it("renders no decision to make", () => {
    const nothing = definePolicy({ version: "1" })
    expect(asksAnything(nothing)).toBe(false)
    const store = createConsentStore({ policy: nothing, environment: "browser" })
    expect(store.getState().needsDecision).toBe(false)
    expect(store.allows(NECESSARY)).toBe(true)
  })

  it("is a one-line change the day it gains a category", () => {
    const grown = definePolicy({ version: "2", categories: [{ id: "analytics" }] })
    expect(asksAnything(grown)).toBe(true)
  })
})

describe("storage that throws", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const hostile: ConsentStorage = guarded(() => {
    throw new DOMException("The operation is insecure.", "SecurityError")
  })

  it("reads as no decision rather than as an exception", () => {
    expect(hostile.read("anything")).toBeNull()
    expect(hostile.write("a", "b")).toBe(false)
    expect(() => hostile.remove("a")).not.toThrow()
  })

  it("still asks, and still refuses, with nowhere to write the answer", () => {
    const store = browserStore({ storage: hostile })
    expect(store.getState().needsDecision).toBe(true)
    store.acceptAll()
    expect(store.allows("analytics")).toBe(true)
    expect(browserStore({ storage: hostile }).getState().needsDecision).toBe(true)
  })

  it("survives a quota failure on write", () => {
    const full = guarded(() => ({
      getItem: () => null,
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError")
      },
      removeItem: () => {},
    }))
    const store = browserStore({ storage: full })
    expect(() => store.acceptAll()).not.toThrow()
    expect(store.allows("analytics")).toBe(true)
  })

  it("treats a malformed record as no decision", () => {
    for (const junk of ["", "{", "null", "[]", '{"version":1}', '{"version":"x"}']) {
      const store = browserStore({ storage: memoryStorage({ [DEFAULT_STORAGE_KEY]: junk }) })
      expect(store.getState().needsDecision, junk).toBe(true)
      expect(store.allows("analytics"), junk).toBe(false)
    }
  })
})

describe("subscription", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("tells a listener when a decision lands", () => {
    const store = browserStore()
    const listener = vi.fn()
    const off = store.subscribe(listener)
    store.acceptAll()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.allows("analytics")).toBe(true)
    off()
    store.rejectAll()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("does not churn the snapshot when nothing changed", () => {
    const store = browserStore()
    const listener = vi.fn()
    store.subscribe(listener)
    const before = store.getState()
    store.rejectAll()
    store.rejectAll()
    expect(store.getState()).not.toBe(before)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("hands the same server snapshot back every time", () => {
    const store = browserStore()
    expect(store.getServerState()).toBe(store.getServerState())
    expect(store.getServerState().resolved).toBe(false)
    expect(store.getServerState().needsDecision).toBe(false)
  })
})

describe("the server", () => {
  it("resolves nothing and asks nothing", () => {
    const store = createConsentStore({ policy, environment: "server" })
    expect(store.getState()).toBe(store.getServerState())
    expect(store.getState().resolved).toBe(false)
    expect(store.allows("analytics")).toBe(false)
  })
})

describe("adopting an older consent key", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("carries a legacy decision forward once", () => {
    localStorage.setItem("provisore:analytics-consent", "granted")
    const store = browserStore({
      migrate: (storage, current) =>
        storage.read("provisore:analytics-consent") === "granted"
          ? {
              version: current.version,
              decidedAt: new Date(0).toISOString(),
              granted: ["analytics"],
              via: "banner",
            }
          : null,
    })
    expect(store.allows("analytics")).toBe(true)
    expect(store.getState().needsDecision).toBe(false)
    expect(parseRecord(localStorage.getItem(DEFAULT_STORAGE_KEY))?.granted).toEqual(["analytics"])
  })

  it("is not consulted once a real record exists", () => {
    browserStore().rejectAll()
    const migrate = vi.fn()
    browserStore({ migrate })
    expect(migrate).not.toHaveBeenCalled()
  })
})

describe("declaring a policy", () => {
  it("refuses a second required category", () => {
    expect(() =>
      definePolicy({ version: "1", categories: [{ id: "analytics", required: true }] }),
    ).toThrow(/required/)
  })

  it("refuses a duplicate id", () => {
    expect(() =>
      definePolicy({ version: "1", categories: [{ id: "analytics" }, { id: "analytics" }] }),
    ).toThrow(/twice/)
  })

  it("always has necessary, first and required", () => {
    const declared = definePolicy({ version: "1", categories: [{ id: "analytics" }] })
    expect(declared.categories[0]?.id).toBe(NECESSARY)
    expect(declared.categories[0]?.required).toBe(true)
  })
})

describe("expiry", () => {
  const stores = [{ name: "_ga", medium: "cookie", holds: "id", lifetime: "2y" }] as const
  const withStores = definePolicy({ version: "1", categories: [{ id: "analytics", stores: [...stores] }] })

  beforeEach(() => {
    localStorage.clear()
    document.cookie = "_ga=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"
  })

  it("re-asks once a decision is older than maxAgeDays", () => {
    const decided = new Date("2026-01-01T00:00:00Z")
    createConsentStore({ policy, environment: "browser", now: () => decided }).acceptAll()

    const fresh = createConsentStore({
      policy,
      environment: "browser",
      maxAgeDays: 180,
      now: () => new Date("2026-06-01T00:00:00Z"),
    })
    expect(fresh.allows("analytics")).toBe(true)

    const stale = createConsentStore({
      policy,
      environment: "browser",
      maxAgeDays: 180,
      now: () => new Date("2026-07-15T00:00:00Z"),
    })
    expect(stale.allows("analytics")).toBe(false)
    expect(stale.getState().needsDecision).toBe(true)
  })

  it("reports each decision with the one before it", () => {
    const seen: Array<[string[], string[] | null]> = []
    const store = createConsentStore({
      policy,
      environment: "browser",
      onDecision: (record, previous) => seen.push([[...record.granted], previous ? [...previous.granted] : null]),
    })
    store.acceptAll()
    store.rejectAll()
    expect(seen).toEqual([
      [["analytics"], null],
      [[], ["analytics"]],
    ])
  })

  it("removes a category's declared items when its grant is withdrawn", () => {
    const store = createConsentStore({ policy: withStores, environment: "browser" })
    store.acceptAll()
    document.cookie = "_ga=GA1.1; path=/"
    expect(document.cookie).toContain("_ga=")

    store.rejectAll()
    expect(document.cookie).not.toContain("_ga=")
  })

  it("removes undeclared-consent items on load", () => {
    document.cookie = "_ga=GA1.1; path=/"
    createConsentStore({ policy: withStores, environment: "browser" })
    expect(document.cookie).not.toContain("_ga=")
  })

  it("leaves everything alone with sweep off", () => {
    document.cookie = "_ga=GA1.1; path=/"
    createConsentStore({ policy: withStores, environment: "browser", sweep: false })
    expect(document.cookie).toContain("_ga=")
  })
})
