import { consent, type ConsentGate } from "./gate.js"
import { nameMatcher, sweepMatching } from "./sweep.js"

export interface GatedScriptOptions {
  readonly src: string
  /** Defaults to "analytics". */
  readonly category?: string
  readonly attributes?: Readonly<Record<string, string>>
  readonly async?: boolean
  readonly defer?: boolean
  /** Storage names or `prefix*` patterns to remove when the grant is withdrawn. */
  readonly sweeps?: readonly string[]
  readonly onLoad?: (script: HTMLScriptElement) => void
  readonly onRemove?: () => void
}

export interface GatedScriptHandle {
  element(): HTMLScriptElement | null
  stop(): void
}

/** Inserts a script when the category is granted and removes it, with its storage, when withdrawn. */
export function connectScript(
  options: GatedScriptOptions,
  gate: ConsentGate = consent(),
): GatedScriptHandle {
  const category = options.category ?? "analytics"
  let element: HTMLScriptElement | null = null
  let stopped = false

  function insert(): void {
    if (element || typeof document === "undefined") return
    const script = document.createElement("script")
    script.src = options.src
    if (options.async ?? true) script.async = true
    if (options.defer) script.defer = true
    for (const [name, value] of Object.entries(options.attributes ?? {})) {
      script.setAttribute(name, value)
    }
    script.addEventListener("load", () => options.onLoad?.(script))
    document.head.append(script)
    element = script
  }

  function remove(): void {
    if (element) {
      element.remove()
      element = null
      options.onRemove?.()
    }
    if (options.sweeps && options.sweeps.length > 0) sweepMatching(nameMatcher(options.sweeps))
  }

  function apply(): void {
    if (stopped) return
    if (gate.allows(category)) insert()
    else remove()
  }

  const unsubscribe = gate.subscribe(apply)
  apply()

  return {
    element: () => element,
    stop() {
      stopped = true
      unsubscribe()
    },
  }
}
