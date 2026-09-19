import { consent, type ConsentGate } from "./gate.js"
import { nameMatcher, sweepMatching } from "./sweep.js"

/** The part of the PostHog client this uses. `posthog-js` satisfies it. */
export interface PostHogLike {
  init(token: string, options: Record<string, unknown>): unknown
  set_config(options: Record<string, unknown>): void
  opt_in_capturing(options?: { captureEventName?: string | null | false }): void
  opt_out_capturing(): void
  reset(resetDeviceId?: boolean): void
}

/**
 * `defer`: do not load until granted.
 * `inert`: load and init, storing and sending nothing.
 * `anonymous`: load, init and send, with memory persistence only.
 */
export type BeforeConsent = "defer" | "inert" | "anonymous"

export interface PostHogAdapterOptions {
  readonly token: string
  /** Defaults to "analytics". */
  readonly category?: string
  readonly beforeConsent?: BeforeConsent
  /** Merged into every configuration. Persistence settings always win. */
  readonly options?: Readonly<Record<string, unknown>>
  /** Typically `() => import("posthog-js").then((m) => m.default)`. */
  readonly load: () => Promise<PostHogLike>
  readonly onReady?: (client: PostHogLike) => void
  readonly onStop?: () => void
}

// `opt_out_capturing_by_default` alone still writes the device id cookie at
// init. Memory persistence is what stops storage; the flags stop sending.
function inertStorage(): Record<string, unknown> {
  return {
    persistence: "memory",
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
  }
}

function consentingStorage(): Record<string, unknown> {
  return {
    persistence: "localStorage+cookie",
    opt_out_capturing_by_default: false,
    opt_out_persistence_by_default: false,
  }
}

export function inertOptions(base: Readonly<Record<string, unknown>> = {}): Record<string, unknown> {
  return { ...base, ...inertStorage() }
}

export function anonymousOptions(
  base: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  return { ...base, persistence: "memory" }
}

export function consentingOptions(
  base: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  return { ...base, ...consentingStorage() }
}

/** Removes every key and cookie carrying the token. Matched by prefix, since the names change between releases. */
export function sweepPostHogStorage(token: string): void {
  sweepMatching(nameMatcher([`ph_${token}_*`, `__ph_opt_in_out_${token}`]))
}

export interface PostHogHandle {
  /** Null while consent is absent or the script is loading. */
  client(): PostHogLike | null
  /** Stops listening. Does not withdraw consent. */
  stop(): void
}

/** Starts PostHog when the gate grants the category and sweeps it when the grant is withdrawn. */
export function connectPostHog(
  options: PostHogAdapterOptions,
  gate: ConsentGate = consent(),
): PostHogHandle {
  const category = options.category ?? "analytics"
  const beforeConsent = options.beforeConsent ?? "defer"
  const load = options.load
  const base = options.options ?? {}

  let client: PostHogLike | null = null
  let loading: Promise<PostHogLike | null> | null = null
  let initialised = false
  let capturing = false
  let stopped = false

  function ensureLoaded(): Promise<PostHogLike | null> {
    if (loading) return loading
    loading = load()
      .then((loaded) => {
        client = loaded
        return loaded
      })
      .catch(() => {
        loading = null
        return null
      })
    return loading
  }

  function turnOn(): void {
    void ensureLoaded().then((loaded) => {
      if (!loaded || stopped) return
      // Consent may have been withdrawn while the script was loading.
      if (!gate.allows(category)) return
      if (!initialised) {
        loaded.init(options.token, consentingOptions(base))
        initialised = true
      } else {
        loaded.set_config(consentingStorage())
      }
      if (!capturing) {
        if (beforeConsent !== "anonymous") loaded.opt_in_capturing({ captureEventName: false })
        capturing = true
      }
      options.onReady?.(loaded)
    })
  }

  function turnOff(): void {
    if (!client || !initialised) return
    const live = client
    capturing = false
    try {
      if (beforeConsent === "anonymous") {
        live.reset(true)
        live.set_config({ persistence: "memory" })
      } else {
        live.opt_out_capturing()
        live.reset(true)
        live.set_config(inertStorage())
      }
    } catch {
      // Swept below regardless.
    }
    sweepPostHogStorage(options.token)
    options.onStop?.()
  }

  function apply(): void {
    if (stopped) return
    if (gate.allows(category)) turnOn()
    else turnOff()
  }

  if (beforeConsent !== "defer" && !gate.allows(category)) {
    void ensureLoaded().then((loaded) => {
      if (!loaded || stopped || initialised) return
      // Consent may have been granted while the script was loading.
      if (gate.allows(category)) return
      loaded.init(
        options.token,
        beforeConsent === "anonymous" ? anonymousOptions(base) : inertOptions(base),
      )
      initialised = true
    })
  }

  const unsubscribe = gate.subscribe(apply)
  apply()

  return {
    client: () => (capturing ? client : null),
    stop() {
      stopped = true
      unsubscribe()
    },
  }
}
