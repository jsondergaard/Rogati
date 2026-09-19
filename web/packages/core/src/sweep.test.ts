import { beforeEach, describe, expect, it } from "vitest"
import { auditStorage } from "./audit.js"
import { definePolicy } from "./policy.js"
import { nameMatcher, sweepStoredItems } from "./sweep.js"

const policy = definePolicy({
  version: "1",
  necessaryStores: [{ name: "session", medium: "cookie", holds: "the sign-in", lifetime: "session" }],
  categories: [
    {
      id: "analytics",
      stores: [
        { name: "ph_*", medium: "localStorage", holds: "a device id", lifetime: "12 months" },
        { name: "_ga", medium: "cookie", holds: "a client id", lifetime: "2 years" },
      ],
    },
  ],
})

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  for (const name of ["_ga", "session", "_fbp"]) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  }
})

describe("matching names", () => {
  it("matches exact names and trailing-star prefixes", () => {
    const matches = nameMatcher(["_ga", "ph_*"])
    expect(matches("_ga")).toBe(true)
    expect(matches("_gat")).toBe(false)
    expect(matches("ph_abc_posthog")).toBe(true)
    expect(matches("ph")).toBe(false)
  })
})

describe("sweeping declared items", () => {
  it("removes only the declared items in the declared medium", () => {
    localStorage.setItem("ph_abc_posthog", "{}")
    localStorage.setItem("ours", "keep")
    sessionStorage.setItem("ph_abc_window_id", "x")
    document.cookie = "_ga=GA1.1; path=/"
    document.cookie = "session=abc; path=/"

    sweepStoredItems(policy.categories[1]!.stores!)

    expect(localStorage.getItem("ph_abc_posthog")).toBeNull()
    expect(localStorage.getItem("ours")).toBe("keep")
    expect(sessionStorage.getItem("ph_abc_window_id")).toBe("x")
    expect(document.cookie).not.toContain("_ga=")
    expect(document.cookie).toContain("session=abc")
  })
})

describe("auditing the browser against the policy", () => {
  it("reports what the policy does not declare", () => {
    localStorage.setItem("ph_abc_posthog", "{}")
    localStorage.setItem("rogati.consent", "{}")
    localStorage.setItem("mystery", "1")
    document.cookie = "_fbp=fb.1; path=/"
    document.cookie = "session=abc; path=/"

    expect(auditStorage(policy)).toEqual([
      { name: "mystery", medium: "localStorage" },
      { name: "_fbp", medium: "cookie" },
    ])
    expect(auditStorage(policy, { ignore: ["mystery", "_fb*"] })).toEqual([])
  })
})
