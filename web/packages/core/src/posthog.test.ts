import { beforeEach, describe, expect, it, vi } from "vitest"
import { definePolicy } from "./policy.js"
import {
  anonymousOptions,
  connectPostHog,
  consentingOptions,
  inertOptions,
  sweepPostHogStorage,
  type PostHogLike,
} from "./posthog.js"
import { createConsentStore } from "./store.js"

const TOKEN = "phc_test"
const policy = definePolicy({ version: "1", categories: [{ id: "analytics" }] })

function fakeClient() {
  const calls: { name: string; args: unknown[] }[] = []
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push({ name, args })
    }
  const client: PostHogLike = {
    init: record("init"),
    set_config: record("set_config"),
    opt_in_capturing: record("opt_in_capturing"),
    opt_out_capturing: record("opt_out_capturing"),
    reset: record("reset"),
  }
  return { client, calls, names: () => calls.map((call) => call.name) }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe("the configurations", () => {
  it("stores nothing and sends nothing while inert", () => {
    expect(inertOptions()).toMatchObject({
      persistence: "memory",
      opt_out_capturing_by_default: true,
      opt_out_persistence_by_default: true,
    })
  })

  it("does not rely on the opt-out flag alone", () => {
    expect(inertOptions()["persistence"]).toBe("memory")
  })

  it("measures while storing nothing when anonymous", () => {
    const options = anonymousOptions()
    expect(options["persistence"]).toBe("memory")
    expect(options["opt_out_capturing_by_default"]).toBeUndefined()
  })

  it("stores and sends once consent is given", () => {
    expect(consentingOptions()).toMatchObject({
      persistence: "localStorage+cookie",
      opt_out_capturing_by_default: false,
    })
  })

  it("keeps the caller's options but not their persistence", () => {
    const merged = inertOptions({ autocapture: false, persistence: "localStorage+cookie" })
    expect(merged["autocapture"]).toBe(false)
    expect(merged["persistence"]).toBe("memory")
  })
})

describe("before consent", () => {
  it("does not even load the script when deferring", async () => {
    const load = vi.fn()
    const store = createConsentStore({ policy, environment: "browser" })
    connectPostHog({ token: TOKEN, load, beforeConsent: "defer" }, store)
    await settle()
    expect(load).not.toHaveBeenCalled()
  })

  it("loads inert when asked to, and initialises with the inert options", async () => {
    const { client, calls } = fakeClient()
    const store = createConsentStore({ policy, environment: "browser" })
    connectPostHog(
      { token: TOKEN, load: async () => client, beforeConsent: "inert" },
      store,
    )
    await settle()
    expect(calls[0]?.name).toBe("init")
    expect(calls[0]?.args[1]).toMatchObject({ persistence: "memory" })
    expect(calls.some((call) => call.name === "opt_in_capturing")).toBe(false)
  })
})

describe("at the moment consent is given", () => {
  it("starts without a reload", async () => {
    const { client, names } = fakeClient()
    const store = createConsentStore({ policy, environment: "browser" })
    const ready = vi.fn()
    connectPostHog({ token: TOKEN, load: async () => client, onReady: ready }, store)
    await settle()
    expect(names()).toEqual([])

    store.acceptAll()
    await settle()
    expect(names()).toEqual(["init", "opt_in_capturing"])
    expect(ready).toHaveBeenCalledWith(client)
  })

  it("does not start if consent was withdrawn while the script loaded", async () => {
    const { client, names } = fakeClient()
    const store = createConsentStore({ policy, environment: "browser" })
    connectPostHog(
      {
        token: TOKEN,
        load: async () => {
          store.rejectAll()
          return client
        },
      },
      store,
    )
    store.acceptAll()
    await settle()
    expect(names()).not.toContain("opt_in_capturing")
  })
})

describe("withdrawal", () => {
  it("silences the client and sweeps its storage", async () => {
    const { client, names } = fakeClient()
    const store = createConsentStore({ policy, environment: "browser" })
    const stopped = vi.fn()
    connectPostHog({ token: TOKEN, load: async () => client, onStop: stopped }, store)
    store.acceptAll()
    await settle()

    localStorage.setItem(`ph_${TOKEN}_posthog`, "{}")
    localStorage.setItem(`__ph_opt_in_out_${TOKEN}`, "1")
    sessionStorage.setItem(`ph_${TOKEN}_window_id`, '"x"')

    store.save([], "preferences")
    expect(names()).toContain("opt_out_capturing")
    expect(names()).toContain("reset")
    expect(localStorage.length).toBe(1) // the consent record, and nothing else
    expect(sessionStorage.length).toBe(0)
    expect(stopped).toHaveBeenCalled()
  })

  it("keeps an anonymous client running and moves it back to memory", async () => {
    const { client, calls, names } = fakeClient()
    const store = createConsentStore({ policy, environment: "browser" })
    connectPostHog(
      { token: TOKEN, load: async () => client, beforeConsent: "anonymous" },
      store,
    )
    await settle()
    store.acceptAll()
    await settle()
    store.save([], "preferences")

    expect(names()).not.toContain("opt_out_capturing")
    expect(names()).toContain("reset")
    expect(calls.at(-1)).toMatchObject({ name: "set_config", args: [{ persistence: "memory" }] })
  })
})

describe("the sweep", () => {
  it("removes every key carrying the token, in both storage areas", () => {
    localStorage.setItem(`ph_${TOKEN}_posthog`, "{}")
    localStorage.setItem(`__ph_opt_in_out_${TOKEN}`, "1")
    localStorage.setItem("something.else", "kept")
    sessionStorage.setItem(`ph_${TOKEN}_window_id`, '"x"')
    sessionStorage.setItem(`ph_${TOKEN}_primary_window_exists`, "true")

    sweepPostHogStorage(TOKEN)

    expect(localStorage.getItem("something.else")).toBe("kept")
    expect(localStorage.length).toBe(1)
    expect(sessionStorage.length).toBe(0)
  })

  it("leaves another project's keys alone", () => {
    localStorage.setItem("ph_phc_other_posthog", "{}")
    sweepPostHogStorage(TOKEN)
    expect(localStorage.getItem("ph_phc_other_posthog")).toBe("{}")
  })
})

describe("a client that will not load", () => {
  it("is a no-op rather than an exception", async () => {
    const store = createConsentStore({ policy, environment: "browser" })
    const handle = connectPostHog(
      { token: TOKEN, load: () => Promise.reject(new Error("blocked")) },
      store,
    )
    store.acceptAll()
    await settle()
    expect(handle.client()).toBeNull()
  })
})
