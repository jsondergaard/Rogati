import { createConsentStore, definePolicy } from "@jsondergaard/rogati-core"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { act } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Consented, RogatiProvider, useAllows } from "./context.js"
import { ConsentPreferencesLink, ConsentSurface } from "./surface.js"

const policy = definePolicy({
  version: "1",
  necessaryStores: [{ name: "session", medium: "cookie", holds: "Your sign-in.", lifetime: "Until you sign out" }],
  categories: [
    {
      id: "analytics",
      stores: [{ name: "ph_*", medium: "localStorage", holds: "A device id.", lifetime: "12 months" }],
    },
  ],
})

function mount(ui: React.ReactNode, props: Partial<React.ComponentProps<typeof ConsentSurface>> = {}) {
  const store = createConsentStore({ policy, environment: "browser" })
  render(
    <RogatiProvider store={store} installGate={false} audit={false}>
      {ui}
      <ConsentPreferencesLink />
      <ConsentSurface {...props} />
    </RogatiProvider>,
  )
  return store
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe("what each category stores", () => {
  it("is listed in the dialog from the policy", async () => {
    mount(null)
    await userEvent.click(screen.getByRole("button", { name: "Storage choices" }))
    const tables = screen.getAllByRole("table", { name: "Stored in your browser" })
    expect(tables).toHaveLength(2)
    const analytics = within(tables[1]!)
    expect(analytics.getByRole("columnheader", { name: "Lasts" })).toBeInTheDocument()
    expect(analytics.getByText("ph_*")).toBeInTheDocument()
    expect(analytics.getByText("Local storage")).toBeInTheDocument()
    expect(analytics.getByText("12 months")).toBeInTheDocument()
    expect(within(tables[0]!).getByText("Cookie")).toBeInTheDocument()
  })
})

describe("banner placement", () => {
  it("carries the position as a data attribute", () => {
    mount(null, { position: "top" })
    expect(screen.getByRole("region")).toHaveAttribute("data-position", "top")
  })

  it("becomes a modal when blocking", async () => {
    mount(null, { blocking: true })
    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(dialog).toHaveAttribute("data-blocking")
    expect(dialog).toHaveAccessibleName("Storage in this browser")
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    const buttons = within(dialog).getAllByRole("button")
    act(() => buttons[buttons.length - 1]!.focus())
    await userEvent.tab()
    expect(dialog.contains(document.activeElement)).toBe(true)
    await userEvent.click(within(dialog).getByRole("button", { name: "Reject" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("gating markup on a category", () => {
  function Probe() {
    return <span>{useAllows("analytics") ? "on" : "off"}</span>
  }

  it("renders the fallback until granted and the children after", async () => {
    const store = mount(
      <>
        <Consented category="analytics" fallback={<em>blocked</em>}>
          <iframe title="embed" />
        </Consented>
        <Probe />
      </>,
    )
    expect(screen.getByText("blocked")).toBeInTheDocument()
    expect(screen.queryByTitle("embed")).not.toBeInTheDocument()
    expect(screen.getByText("off")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Accept" }))
    expect(screen.getByTitle("embed")).toBeInTheDocument()
    expect(screen.getByText("on")).toBeInTheDocument()

    act(() => store.rejectAll())
    expect(screen.queryByTitle("embed")).not.toBeInTheDocument()
  })
})

describe("the development audit", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
  afterEach(() => warn.mockClear())

  it("names storage the policy does not declare", async () => {
    vi.useFakeTimers()
    localStorage.setItem("mystery", "1")
    render(
      <RogatiProvider policy={policy} options={{ environment: "browser" }} installGate={false} audit>
        <ConsentSurface />
      </RogatiProvider>,
    )
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    vi.useRealTimers()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain("localStorage: mystery")
  })
})
