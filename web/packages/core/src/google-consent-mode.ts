import { consent, type ConsentGate } from "./gate.js"

export type ConsentModeType =
  | "ad_storage"
  | "ad_user_data"
  | "ad_personalization"
  | "analytics_storage"
  | "functionality_storage"
  | "personalization_storage"
  | "security_storage"

export type ConsentModeState = "granted" | "denied"

export type Gtag = (...args: unknown[]) => void

export interface GoogleConsentModeOptions {
  /** Which policy category grants each consent type. Unlisted types stay denied. */
  readonly categories: Partial<Readonly<Record<ConsentModeType, string>>>
  /** Milliseconds gtag waits for the first update before firing tags. Default 500. */
  readonly waitForUpdate?: number
  /** Defaults to a `window.dataLayer` push. */
  readonly gtag?: Gtag
  /** Extra keys for the default command, e.g. `{ region: ["DK"] }`. */
  readonly defaults?: Readonly<Record<string, unknown>>
}

const ALL_TYPES: readonly ConsentModeType[] = [
  "ad_storage",
  "ad_user_data",
  "ad_personalization",
  "analytics_storage",
  "functionality_storage",
  "personalization_storage",
  "security_storage",
]

function dataLayerGtag(): Gtag {
  return function gtag() {
    if (typeof window === "undefined") return
    const w = window as unknown as { dataLayer?: unknown[] }
    w.dataLayer = w.dataLayer ?? []
    // gtag reads `arguments`, not an array, so this must not be an arrow function.
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer.push(arguments)
  }
}

export function consentModeState(
  gate: ConsentGate,
  categories: GoogleConsentModeOptions["categories"],
): Record<ConsentModeType, ConsentModeState> {
  const state = {} as Record<ConsentModeType, ConsentModeState>
  for (const type of ALL_TYPES) {
    const category = categories[type]
    if (type === "security_storage" && category === undefined) {
      state[type] = "granted"
      continue
    }
    state[type] = category !== undefined && gate.allows(category) ? "granted" : "denied"
  }
  return state
}

/**
 * Sends the Consent Mode v2 default before any tag fires, then an update on
 * every change. Call it before the gtag or Tag Manager snippet runs.
 */
export function connectGoogleConsentMode(
  options: GoogleConsentModeOptions,
  gate: ConsentGate = consent(),
): () => void {
  const gtag = options.gtag ?? dataLayerGtag()
  const current = () => consentModeState(gate, options.categories)

  gtag("consent", "default", {
    ...Object.fromEntries(ALL_TYPES.map((type) => [type, "denied"])),
    security_storage: "granted",
    wait_for_update: options.waitForUpdate ?? 500,
    ...(options.defaults ?? {}),
  })

  let last = ""
  const apply = () => {
    const next = current()
    const key = JSON.stringify(next)
    if (key === last) return
    last = key
    gtag("consent", "update", next)
  }

  const unsubscribe = gate.subscribe(apply)
  apply()
  return unsubscribe
}
