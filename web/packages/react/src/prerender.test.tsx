import { DEFAULT_STORAGE_KEY, createConsentStore, definePolicy } from "@jsondergaard/rogati-core"
import { act } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToStaticMarkup, renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RogatiProvider } from "./context.js"
import { ConsentPreferencesLink, ConsentSurface } from "./surface.js"

const policy = definePolicy({ version: "2026-09-01", categories: [{ id: "analytics" }] })

function Page({ store }: { store?: ReturnType<typeof createConsentStore> }) {
  return (
    <RogatiProvider
      {...(store ? { store } : { policy, options: { environment: "server" as const } })}
      installGate={false}
    >
      <main>the page</main>
      <ConsentPreferencesLink />
      <ConsentSurface />
    </RogatiProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe("what the prerenderer writes", () => {
  it.each([
    ["renderToStaticMarkup", renderToStaticMarkup],
    ["renderToString", renderToString],
  ])("puts no banner in the HTML with %s", (_name, renderer) => {
    const html = renderer(<Page />)
    expect(html).toContain("the page")
    expect(html).not.toContain("rogati-banner")
    expect(html).not.toContain("rogati-card")
    expect(html).not.toContain("Accept")
  })

  it("emits no stylesheet for a component that is not there", () => {
    expect(renderToStaticMarkup(<Page />)).not.toContain("rogati-choice")
  })

  it("reads nothing while rendering on the server", () => {
    const reads: string[] = []
    const store = createConsentStore({
      policy,
      environment: "server",
      storage: {
        read: (key) => {
          reads.push(key)
          return null
        },
        write: () => true,
        remove: () => {},
      },
    })
    renderToStaticMarkup(<Page store={store} />)
    expect(reads).toEqual([])
  })
})

describe("hydrating the prerendered page", () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {})
  afterEach(() => errors.mockClear())

  function hydrate(html: string, store: ReturnType<typeof createConsentStore>) {
    const container = document.createElement("div")
    container.innerHTML = html
    document.body.append(container)
    const seen: boolean[] = []
    const observer = new MutationObserver(() =>
      seen.push(container.querySelector(".rogati-banner") !== null),
    )
    observer.observe(container, { childList: true, subtree: true })
    act(() => {
      hydrateRoot(container, <Page store={store} />)
    })
    observer.disconnect()
    return { container, seen }
  }

  it("shows nothing to a visitor who already answered", () => {
    createConsentStore({ policy, environment: "browser" }).rejectAll()
    expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).not.toBeNull()

    const html = renderToString(<Page />)
    const store = createConsentStore({ policy, environment: "browser" })
    expect(store.getState().needsDecision).toBe(false)

    const { container, seen } = hydrate(html, store)
    expect(seen).not.toContain(true)
    expect(container.querySelector(".rogati-banner")).toBeNull()
    expect(container.textContent).toContain("the page")
  })

  it("hydrates without a mismatch", () => {
    const html = renderToString(<Page />)
    const store = createConsentStore({ policy, environment: "browser" })
    hydrate(html, store)
    const complaints = errors.mock.calls
      .map((call) => String(call[0]))
      .filter((message) => /hydrat|did not match|server HTML/i.test(message))
    expect(complaints).toEqual([])
  })

  it("shows the banner to a visitor who has not answered", () => {
    const html = renderToString(<Page />)
    expect(html).not.toContain("rogati-banner")
    const store = createConsentStore({ policy, environment: "browser" })
    const { container } = hydrate(html, store)
    expect(container.querySelector(".rogati-banner")).not.toBeNull()
  })
})

describe("rendering fresh rather than hydrating", () => {
  it("shows nothing to a decided visitor on the first commit", () => {
    createConsentStore({ policy, environment: "browser" }).acceptAll()
    const store = createConsentStore({ policy, environment: "browser" })
    const html = renderToStaticMarkup(<Page store={store} />)
    expect(html).not.toContain("rogati-banner")
    expect(store.allows("analytics")).toBe(true)
  })
})
