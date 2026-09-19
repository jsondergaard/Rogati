import { consent, createConsentStore, deniedGate, definePolicy } from "@jsondergaard/rogati-core"
import { screen, waitFor, within } from "@testing-library/dom"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mountConsent, type ConsentMount } from "./index.js"

const policy = definePolicy({
  version: "1",
  categories: [
    { id: "analytics", stores: [{ name: "_ga", medium: "cookie", holds: "An id.", lifetime: "2 years" }] },
  ],
})

let mounted: ConsentMount | null = null

function mount(over: Parameters<typeof mountConsent>[0] = {}) {
  document.body.innerHTML = '<main>page</main><footer><a href="#" id="link">Storage choices</a></footer>'
  mounted = mountConsent({
    policy,
    options: { environment: "browser" },
    preferencesLinks: "#link",
    ...over,
  })
  return mounted
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  mounted?.destroy()
  mounted = null
  document.body.innerHTML = ""
})

describe("mounting without React", () => {
  it("asks, installs the gate, and records the answer", async () => {
    const { store } = mount()
    expect(consent()).toBe(store)
    const region = screen.getByRole("region", { name: "Storage choices" })
    expect(document.head.querySelector("style[data-rogati]")).not.toBeNull()
    expect(document.activeElement).toBe(document.body)

    await userEvent.click(within(region).getByRole("button", { name: "Reject" }))
    expect(screen.queryByRole("region")).toBeNull()
    expect(store.allows("analytics")).toBe(false)
    expect(localStorage.getItem("rogati.consent")).not.toBeNull()

    mounted!.destroy()
    expect(consent()).toBe(deniedGate)
  })

  it("stays down for a decided visitor", () => {
    createConsentStore({ policy, environment: "browser" }).acceptAll()
    mount()
    expect(screen.queryByRole("region")).toBeNull()
  })

  it("opens the dialog from a bound footer link and lists what is stored", async () => {
    const { store } = mount()
    await userEvent.click(document.getElementById("link")!)
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(document.activeElement).toBe(dialog)
    expect(within(dialog).getByText("_ga")).toBeInTheDocument()
    expect(within(dialog).getByText("2 years")).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole("checkbox", { name: /Analytics/ }))
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(store.allows("analytics")).toBe(true)
    expect(store.record()?.via).toBe("preferences")
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById("link")))
  })

  it("closes on Escape without saving", async () => {
    const { store } = mount()
    mounted!.openPreferences()
    await userEvent.click(screen.getByRole("checkbox", { name: /Analytics/ }))
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(store.allows("analytics")).toBe(false)
  })

  it("blocks the page when asked to", async () => {
    mount({ blocking: true, position: "top" })
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveAttribute("data-blocking")
    expect(dialog).toHaveAttribute("data-position", "top")
    expect(dialog.contains(document.activeElement)).toBe(true)
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it("renders nothing for a policy with nothing optional", () => {
    mount({ policy: definePolicy({ version: "1" }) })
    expect(screen.queryByRole("region")).toBeNull()
    expect(document.getElementById("link")!.hidden).toBe(true)
  })
})
