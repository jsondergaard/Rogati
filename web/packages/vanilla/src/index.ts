import {
  NECESSARY,
  asksAnything,
  categoryCopy,
  consentStylesheet,
  createConsentStore,
  englishCopy,
  installConsentGate,
  optionalCategories,
  type ConsentCopy,
  type ConsentPolicy,
  type ConsentStore,
  type ConsentStoreOptions,
  type StoredItem,
} from "@jsondergaard/rogati-core"

export type BannerPosition = "bottom" | "bottom-left" | "bottom-right" | "top"

export interface MountOptions {
  readonly policy?: ConsentPolicy
  readonly store?: ConsentStore
  readonly options?: Omit<ConsentStoreOptions, "policy">
  readonly copy?: ConsentCopy
  readonly position?: BannerPosition
  readonly blocking?: boolean
  /** Where the banner and dialog are appended. Defaults to `document.body`. */
  readonly target?: Element
  /** A selector for footer links that open the dialog. */
  readonly preferencesLinks?: string
  readonly installGate?: boolean
}

export interface ConsentMount {
  readonly store: ConsentStore
  openPreferences(): void
  closePreferences(): void
  /** Makes an element open the dialog on click. Returns the unbind. */
  bindPreferencesLink(element: Element): () => void
  destroy(): void
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Record<string, string>> = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined) continue
    if (name === "className") node.className = value
    else if (name === "text") node.textContent = value
    else node.setAttribute(name, value)
  }
  node.append(...children)
  return node
}

function ensureStylesheet(): void {
  if (document.head.querySelector("style[data-rogati]")) return
  document.head.append(el("style", { "data-rogati": "" }, [consentStylesheet]))
}

let ids = 0
const nextId = () => `rogati-${(ids += 1)}`

/** Mounts the banner and the preferences dialog. Nothing renders until the store says the visitor should be asked. */
export function mountConsent(options: MountOptions): ConsentMount {
  const store =
    options.store ??
    (() => {
      if (!options.policy) throw new Error("mountConsent needs either a policy or a store.")
      return createConsentStore({ policy: options.policy, ...options.options })
    })()
  const copy = options.copy ?? englishCopy
  const target = options.target ?? document.body
  const uninstall = options.installGate === false ? () => {} : installConsentGate(store)
  const cleanups: Array<() => void> = [uninstall]

  let banner: HTMLElement | null = null
  let dialog: HTMLElement | null = null
  let restoreFocus: (() => void) | null = null
  let restoreBannerFocus: (() => void) | null = null

  function trap(container: HTMLElement): () => void {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return
      const stops = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
      const first = stops[0]
      const last = stops[stops.length - 1]
      if (!first || !last) return
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === container)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    container.addEventListener("keydown", onKeyDown)
    return () => container.removeEventListener("keydown", onKeyDown)
  }

  function renderBanner(): void {
    const state = store.getState()
    const wanted = asksAnything(store.policy) && state.resolved && state.needsDecision
    if (!wanted) {
      banner?.remove()
      banner = null
      restoreBannerFocus?.()
      restoreBannerFocus = null
      return
    }
    if (banner) return
    ensureStylesheet()
    const headingId = nextId()
    const bodyId = nextId()
    const blocking = options.blocking === true
    const reject = el("button", { type: "button", className: "rogati-choice", text: copy.reject })
    const accept = el("button", { type: "button", className: "rogati-choice", text: copy.accept })
    const prefs = el("button", { type: "button", className: "rogati-quiet", text: copy.preferences })
    reject.addEventListener("click", () => store.rejectAll("banner"))
    accept.addEventListener("click", () => store.acceptAll("banner"))
    prefs.addEventListener("click", () => openPreferences())

    const live = el("div", { className: "rogati-offscreen", role: "status", "aria-live": "polite" })
    const card = el("div", { className: "rogati-card" }, [
      live,
      el("h2", { className: "rogati-title", id: headingId, text: copy.heading }),
      el("p", { className: "rogati-body", id: bodyId, text: copy.body }),
      el("div", { className: "rogati-actions" }, [reject, accept, prefs]),
    ])
    banner = el(
      "div",
      {
        className: "rogati rogati-banner",
        "data-position": options.position ?? "bottom",
        ...(blocking
          ? { "data-blocking": "", role: "dialog", "aria-modal": "true", "aria-labelledby": headingId, "aria-describedby": bodyId }
          : { role: "region", "aria-label": copy.regionLabel }),
      },
      [card],
    )
    target.append(banner)
    if (blocking) {
      const opener = document.activeElement as HTMLElement | null
      const untrap = trap(banner)
      reject.focus()
      restoreBannerFocus = () => {
        untrap()
        opener?.focus?.()
      }
    } else {
      setTimeout(() => {
        live.textContent = `${copy.heading}. ${copy.body}`
      }, 120)
    }
  }

  function storesTable(items: readonly StoredItem[]): HTMLElement {
    const head = el("tr", {}, (["name", "medium", "holds", "lifetime"] as const).map((column) =>
      el("th", { scope: "col", text: copy.columns[column] }),
    ))
    const rows = items.map((item) =>
      el("tr", {}, [
        el("td", {}, [el("code", { text: item.name })]),
        el("td", { text: copy.media[item.medium] }),
        el("td", { text: item.holds }),
        el("td", { text: item.lifetime }),
      ]),
    )
    return el("table", { className: "rogati-stores" }, [
      el("caption", { text: copy.storesHeading }),
      el("thead", {}, [head]),
      el("tbody", {}, rows),
    ])
  }

  function category(id: string, checked: boolean, disabled: boolean, onChange: (on: boolean) => void): HTMLElement {
    const inputId = nextId()
    const noteId = nextId()
    const text = categoryCopy(copy, id)
    const input = el("input", { id: inputId, type: "checkbox", "aria-describedby": noteId })
    input.checked = checked
    input.disabled = disabled
    input.addEventListener("change", () => onChange(input.checked))
    const label = el("label", { className: "rogati-category-name", for: inputId, text: text.title })
    if (disabled) label.append(el("span", { className: "rogati-always", text: ` · ${copy.alwaysOn}` }))
    const stores = store.policy.categories.find((c) => c.id === id)?.stores ?? []
    const item = el("li", { className: "rogati-category" }, [
      input,
      label,
      el("p", { className: "rogati-category-note", id: noteId, text: text.description }),
    ])
    if (stores.length > 0) item.append(storesTable(stores))
    return item
  }

  function openPreferences(): void {
    if (dialog) return
    ensureStylesheet()
    const state = store.getState()
    const optional = optionalCategories(store.policy).map((c) => c.id)
    let chosen = [...state.granted]
    const headingId = nextId()
    const bodyId = nextId()

    const list = el("ul", { className: "rogati-categories" }, [
      category(NECESSARY, true, true, () => {}),
      ...optional.map((id) =>
        category(id, chosen.includes(id), false, (on) => {
          chosen = on ? [...chosen, id] : chosen.filter((entry) => entry !== id)
        }),
      ),
    ])

    const save = (granted: Iterable<string>) => {
      store.save(granted, "preferences")
      closePreferences()
    }
    const rejectAll = el("button", { type: "button", className: "rogati-choice", text: copy.rejectAll })
    const acceptAll = el("button", { type: "button", className: "rogati-choice", text: copy.acceptAll })
    const saveButton = el("button", { type: "button", className: "rogati-choice", text: copy.save })
    const close = el("button", { type: "button", className: "rogati-quiet", text: copy.close })
    rejectAll.addEventListener("click", () => save([]))
    acceptAll.addEventListener("click", () => save(optional))
    saveButton.addEventListener("click", () => save(chosen))
    close.addEventListener("click", () => closePreferences())

    const surface = el(
      "div",
      { className: "rogati-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": headingId, "aria-describedby": bodyId, tabindex: "-1" },
      [
        el("h2", { className: "rogati-title", id: headingId, text: copy.dialogHeading }),
        el("p", { className: "rogati-body", id: bodyId, text: copy.dialogBody }),
      ],
    )
    if (state.signals.length > 0) {
      const names = state.signals.map((signal) => copy.signalNames[signal] ?? signal).join(copy.signalJoin)
      surface.append(el("p", { className: "rogati-notice", text: copy.signalNotice.replace("{signal}", names) }))
    }
    surface.append(list, el("div", { className: "rogati-actions" }, [rejectAll, acceptAll, saveButton, close]))

    dialog = el("div", { className: "rogati rogati-scrim" }, [surface])
    dialog.addEventListener("mousedown", (event) => {
      if (event.target === dialog) closePreferences()
    })
    surface.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.stopPropagation()
        closePreferences()
      }
    })
    const untrap = trap(surface)
    const opener = document.activeElement as HTMLElement | null
    target.append(dialog)
    surface.focus()
    restoreFocus = () => {
      untrap()
      opener?.focus?.()
    }
  }

  function closePreferences(): void {
    if (!dialog) return
    dialog.remove()
    dialog = null
    restoreFocus?.()
    restoreFocus = null
  }

  function bindPreferencesLink(element: Element): () => void {
    const onClick = (event: Event) => {
      event.preventDefault()
      openPreferences()
    }
    element.addEventListener("click", onClick)
    if (!asksAnything(store.policy)) (element as HTMLElement).hidden = true
    return () => element.removeEventListener("click", onClick)
  }

  if (options.preferencesLinks) {
    for (const link of document.querySelectorAll(options.preferencesLinks)) {
      cleanups.push(bindPreferencesLink(link))
    }
  }

  cleanups.push(store.subscribe(renderBanner))
  renderBanner()

  return {
    store,
    openPreferences,
    closePreferences,
    bindPreferencesLink,
    destroy() {
      closePreferences()
      banner?.remove()
      banner = null
      for (const cleanup of cleanups) cleanup()
    },
  }
}
