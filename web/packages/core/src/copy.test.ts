import { describe, expect, it } from "vitest"
import { copies, copyFor, englishCopy, germanCopy, norwegianCopy, withCopy } from "./copy.js"

describe("picking copy for a locale", () => {
  it("matches the language subtag and falls back to English", () => {
    expect(copyFor("da-DK")).toBe(copies["da"])
    expect(copyFor("nb_NO")).toBe(norwegianCopy)
    expect(copyFor("no")).toBe(norwegianCopy)
    expect(copyFor("DE")).toBe(germanCopy)
    expect(copyFor("fr")).toBe(englishCopy)
    expect(copyFor(undefined)).toBe(englishCopy)
  })

  it("has every field filled in every language", () => {
    for (const copy of Object.values(copies)) {
      for (const [key, value] of Object.entries(copy)) {
        if (typeof value === "string") expect(value, key).not.toBe("")
      }
      expect(copy.signalNotice).toContain("{signal}")
      expect(Object.keys(copy.media)).toEqual(["cookie", "localStorage", "sessionStorage"])
    }
  })
})

describe("overriding copy", () => {
  it("merges nested maps and ignores explicit undefined", () => {
    const copy = withCopy(englishCopy, {
      accept: undefined,
      categories: { marketing: { title: "Marketing", description: "Ads." } },
      columns: { lifetime: "Kept for" },
    })
    expect(copy.accept).toBe("Accept")
    expect(copy.categories["analytics"]).toBeDefined()
    expect(copy.categories["marketing"]?.title).toBe("Marketing")
    expect(copy.columns).toEqual({ ...englishCopy.columns, lifetime: "Kept for" })
  })
})
