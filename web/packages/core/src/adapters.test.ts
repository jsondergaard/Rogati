import { beforeEach, describe, expect, it, vi } from "vitest"
import { connectFathom } from "./fathom.js"
import { connectGoogleConsentMode } from "./google-consent-mode.js"
import { connectMetaPixel } from "./meta-pixel.js"
import { connectPlausible } from "./plausible.js"
import { definePolicy } from "./policy.js"
import { connectScript } from "./script.js"
import { createConsentStore } from "./store.js"

const policy = definePolicy({
  version: "1",
  categories: [{ id: "analytics" }, { id: "marketing" }],
})

function store() {
  return createConsentStore({ policy, environment: "browser", storage: memory() })
}

function memory() {
  const map = new Map<string, string>()
  return {
    read: (k: string) => map.get(k) ?? null,
    write: (k: string, v: string) => (map.set(k, v), true),
    remove: (k: string) => void map.delete(k),
  }
}

beforeEach(() => {
  document.head.innerHTML = ""
  document.cookie = "_fbp=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"
  delete (window as unknown as { dataLayer?: unknown }).dataLayer
  delete (window as unknown as { fbq?: unknown }).fbq
})

describe("Google Consent Mode", () => {
  it("sends a denied default, then updates as the gate changes", () => {
    const gate = store()
    const gtag = vi.fn()
    connectGoogleConsentMode(
      { categories: { analytics_storage: "analytics", ad_storage: "marketing", ad_user_data: "marketing", ad_personalization: "marketing" }, gtag },
      gate,
    )
    expect(gtag).toHaveBeenNthCalledWith(1, "consent", "default", expect.objectContaining({
      analytics_storage: "denied",
      ad_storage: "denied",
      security_storage: "granted",
      wait_for_update: 500,
    }))
    expect(gtag).toHaveBeenNthCalledWith(2, "consent", "update", expect.objectContaining({
      analytics_storage: "denied",
      ad_storage: "denied",
    }))

    gate.save(["analytics"])
    expect(gtag).toHaveBeenLastCalledWith("consent", "update", expect.objectContaining({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      functionality_storage: "denied",
    }))

    gate.acceptAll()
    expect(gtag).toHaveBeenLastCalledWith("consent", "update", expect.objectContaining({
      ad_storage: "granted",
      ad_personalization: "granted",
    }))
  })

  it("falls back to pushing onto the dataLayer", () => {
    connectGoogleConsentMode({ categories: { analytics_storage: "analytics" } }, store())
    const layer = (window as unknown as { dataLayer: IArguments[] }).dataLayer
    expect(layer).toHaveLength(2)
    expect([...layer[0]!]).toEqual(["consent", "default", expect.any(Object)])
  })
})

describe("gated scripts", () => {
  it("inserts on grant and removes, with its storage, on withdrawal", () => {
    const gate = store()
    const handle = connectScript({ src: "https://x.test/s.js", sweeps: ["vendor_*"] }, gate)
    expect(handle.element()).toBeNull()
    expect(document.head.querySelector("script")).toBeNull()

    gate.acceptAll()
    localStorage.setItem("vendor_id", "1")
    const script = document.head.querySelector("script")!
    expect(script.src).toBe("https://x.test/s.js")
    expect(script.async).toBe(true)
    expect(localStorage.getItem("vendor_id")).toBe("1")

    gate.rejectAll()
    expect(document.head.querySelector("script")).toBeNull()
    expect(handle.element()).toBeNull()
    expect(localStorage.getItem("vendor_id")).toBeNull()
  })

  it("configures Plausible and Fathom by attribute", () => {
    const gate = store()
    gate.acceptAll()
    connectPlausible({ domain: "example.com" }, gate)
    connectFathom({ siteId: "ABCDEF" }, gate)
    const scripts = [...document.head.querySelectorAll("script")]
    expect(scripts.map((s) => s.src)).toEqual([
      "https://plausible.io/js/script.js",
      "https://cdn.usefathom.com/script.js",
    ])
    expect(scripts[0]!.dataset["domain"]).toBe("example.com")
    expect(scripts[0]!.defer).toBe(true)
    expect(scripts[1]!.dataset["site"]).toBe("ABCDEF")
  })
})

describe("Meta Pixel", () => {
  it("revokes until marketing is granted, then inits, then revokes and sweeps", () => {
    const gate = store()
    document.cookie = "_fbp=fb.1.1; path=/"
    connectMetaPixel({ pixelId: "123" }, gate)
    const fbq = (window as unknown as { fbq: { queue: IArguments[] } }).fbq
    const calls = () => fbq.queue.map((call) => [...call])
    expect(calls()).toEqual([["consent", "revoke"]])
    expect(document.head.querySelector("script")).toBeNull()

    gate.save(["marketing"])
    const script = document.head.querySelector("script")!
    expect(script.src).toContain("fbevents.js")
    script.dispatchEvent(new Event("load"))
    expect(calls()).toEqual([
      ["consent", "revoke"],
      ["consent", "grant"],
      ["init", "123"],
      ["track", "PageView"],
    ])

    gate.rejectAll()
    expect(calls().at(-1)).toEqual(["consent", "revoke"])
    expect(document.cookie).not.toContain("_fbp=")
  })
})
