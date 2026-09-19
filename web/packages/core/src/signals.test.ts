import { describe, expect, it } from "vitest"
import { privacySignals } from "./signals.js"

describe("global privacy control", () => {
  it("is the boolean the specification defines", () => {
    expect(privacySignals({ navigator: { globalPrivacyControl: true }, window: {} })).toEqual([
      "globalPrivacyControl",
    ])
  })

  it("accepts the string an extension sets", () => {
    expect(privacySignals({ navigator: { globalPrivacyControl: "1" }, window: {} })).toEqual([
      "globalPrivacyControl",
    ])
  })

  it("is not set by a false or absent property", () => {
    expect(privacySignals({ navigator: { globalPrivacyControl: false }, window: {} })).toEqual([])
    expect(privacySignals({ navigator: {}, window: {} })).toEqual([])
  })
})

describe("do not track", () => {
  it.each([
    ["navigator.doNotTrack '1'", { navigator: { doNotTrack: "1" }, window: {} }],
    ["navigator.doNotTrack true", { navigator: { doNotTrack: true }, window: {} }],
    ["navigator.doNotTrack 'yes'", { navigator: { doNotTrack: "yes" }, window: {} }],
    ["navigator.msDoNotTrack", { navigator: { msDoNotTrack: "1" }, window: {} }],
    ["window.doNotTrack", { navigator: {}, window: { doNotTrack: "1" } }],
  ])("reads %s as a refusal", (_label, sources) => {
    expect(privacySignals(sources)).toEqual(["doNotTrack"])
  })

  it.each(["unspecified", "0", "", null, undefined])("ignores %s", (value) => {
    expect(privacySignals({ navigator: { doNotTrack: value }, window: {} })).toEqual([])
  })
})

describe("no browser", () => {
  it("reports nothing rather than guessing", () => {
    expect(privacySignals({ navigator: undefined, window: undefined })).toEqual([])
  })
})

describe("both at once", () => {
  it("reports each one, so a dialog can say which is on", () => {
    expect(
      privacySignals({ navigator: { globalPrivacyControl: true, doNotTrack: "1" }, window: {} }),
    ).toEqual(["globalPrivacyControl", "doNotTrack"])
  })
})
