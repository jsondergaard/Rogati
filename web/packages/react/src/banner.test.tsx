import { DEFAULT_STORAGE_KEY, createConsentStore, definePolicy } from "@jsondergaard/rogati-core"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { act } from "react"
import { beforeEach, describe, expect, it } from "vitest"
import { RogatiProvider } from "./context.js"
import { danishCopy } from "./copy.js"
import { ConsentPreferencesLink, ConsentSurface } from "./surface.js"

const policy = definePolicy({
  version: "2026-09-01",
  categories: [{ id: "analytics" }],
})

function mount(over: { store?: ReturnType<typeof createConsentStore> } = {}) {
  const store = over.store ?? createConsentStore({ policy, environment: "browser" })
  const view = render(
    <RogatiProvider store={store} installGate={false}>
      <p>page</p>
      <ConsentPreferencesLink />
      <ConsentSurface />
    </RogatiProvider>,
  )
  return { store, view }
}

function banner() {
  return screen.queryByRole("region", { name: "Storage choices" })
}

beforeEach(() => {
  localStorage.clear()
})

describe("asking", () => {
  it("shows the banner to somebody who has not decided", () => {
    mount()
    expect(banner()).toBeInTheDocument()
  })

  it("gives the two answers equal weight", () => {
    mount()
    const region = banner()!
    const accept = within(region).getByRole("button", { name: "Accept" })
    const reject = within(region).getByRole("button", { name: "Reject" })

    expect(reject.className).toBe(accept.className)
    expect(reject.className.split(" ")).toEqual(["rogati-choice"])
    expect(accept.tagName).toBe(reject.tagName)
    expect(reject.compareDocumentPosition(accept)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it("does not steal focus", () => {
    mount()
    expect(document.activeElement).toBe(document.body)
    expect(banner()).not.toHaveAttribute("aria-modal")
    expect(banner()!.getAttribute("role")).toBe("region")
  })

  it("announces itself politely", async () => {
    mount()
    const live = banner()!.querySelector('[role="status"]')!
    expect(live).toHaveAttribute("aria-live", "polite")
    expect(live.textContent).toBe("")
    await waitFor(() => expect(live.textContent).toContain("Storage in this browser"))
  })

  it("renders the copy it is given", () => {
    render(
      <RogatiProvider policy={policy} copy={danishCopy} installGate={false}>
        <ConsentSurface />
      </RogatiProvider>,
    )
    expect(screen.getByRole("button", { name: "Afvis" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Acceptér" })).toBeInTheDocument()
  })
})

describe("deciding", () => {
  it("stores only the record when the visitor rejects", async () => {
    const { store } = mount()
    await userEvent.click(screen.getByRole("button", { name: "Reject" }))

    expect(banner()).not.toBeInTheDocument()
    expect(store.allows("analytics")).toBe(false)
    expect(Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))).toEqual([
      DEFAULT_STORAGE_KEY,
    ])
    expect(document.cookie).toBe("")
  })

  it("grants on accept, without a reload", async () => {
    const { store } = mount()
    await userEvent.click(screen.getByRole("button", { name: "Accept" }))
    expect(store.allows("analytics")).toBe(true)
    expect(banner()).not.toBeInTheDocument()
  })

  it("stays down on the next page", () => {
    createConsentStore({ policy, environment: "browser" }).rejectAll()
    mount({ store: createConsentStore({ policy, environment: "browser" }) })
    expect(banner()).not.toBeInTheDocument()
  })
})

describe("the preferences dialog", () => {
  async function open() {
    const mounted = mount()
    await userEvent.click(screen.getByRole("button", { name: "Storage choices" }))
    return mounted
  }

  it("opens from the footer link, so a decision can be withdrawn", async () => {
    const { store } = await open()
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveAttribute("aria-modal", "true")

    await userEvent.click(within(dialog).getByRole("button", { name: "Accept all" }))
    expect(store.allows("analytics")).toBe(true)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Storage choices" }))
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Reject all" }),
    )
    expect(store.allows("analytics")).toBe(false)
  })

  it("starts with nothing optional ticked", async () => {
    await open()
    const analytics = screen.getByRole("checkbox", { name: /Analytics/ })
    expect(analytics).not.toBeChecked()
    const necessary = screen.getByRole("checkbox", { name: /Necessary/ })
    expect(necessary).toBeChecked()
    expect(necessary).toBeDisabled()
  })

  it("saves exactly what was ticked, and closes", async () => {
    const { store } = await open()
    await userEvent.click(screen.getByRole("checkbox", { name: /Analytics/ }))
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(store.allows("analytics")).toBe(true)
    expect(store.record()?.via).toBe("preferences")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("forgets an abandoned toggle", async () => {
    await open()
    await userEvent.click(screen.getByRole("checkbox", { name: /Analytics/ }))
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Storage choices" }))
    expect(screen.getByRole("checkbox", { name: /Analytics/ })).not.toBeChecked()
  })

  it("closes on Escape and hands focus back to what opened it", async () => {
    await open()
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Storage choices" })),
    )
  })

  it("keeps Tab inside itself", async () => {
    await open()
    const dialog = screen.getByRole("dialog")
    const stops = within(dialog).getAllByRole("button")
    const last = stops[stops.length - 1]!
    act(() => last.focus())
    await userEvent.tab()
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it("names the browser signal that already answered", async () => {
    render(
      <RogatiProvider
        policy={policy}
        options={{ environment: "browser", signals: ["globalPrivacyControl"] }}
        installGate={false}
      >
        <ConsentPreferencesLink />
        <ConsentSurface />
      </RogatiProvider>,
    )
    expect(banner()).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Storage choices" }))
    expect(screen.getByText(/Global Privacy Control/)).toBeInTheDocument()
  })
})

describe("a site with nothing to ask about", () => {
  it("renders neither a banner nor a footer link", () => {
    const nothing = definePolicy({ version: "1" })
    const { container } = render(
      <RogatiProvider policy={nothing} installGate={false}>
        <ConsentPreferencesLink />
        <ConsentSurface />
      </RogatiProvider>,
    )
    expect(container.innerHTML).toBe("")
  })
})
