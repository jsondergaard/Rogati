import type { ConsentGate, ConsentStatus } from "./gate.js"
import {
  NECESSARY,
  asksAnything,
  optionalCategories,
  type CategoryDeclaration,
  type ConsentPolicy,
} from "./policy.js"
import { answersPolicy, parseRecord, serialiseRecord, type ConsentRecord } from "./record.js"
import { privacySignals, type PrivacySignal } from "./signals.js"
import { browserStorage, memoryStorage, type ConsentStorage } from "./storage.js"
import { sweepStoredItems } from "./sweep.js"

export const DEFAULT_STORAGE_KEY = "rogati.consent"

export interface ConsentState {
  /** False on the server and during hydration. */
  readonly resolved: boolean
  readonly record: ConsentRecord | null
  readonly signals: readonly PrivacySignal[]
  readonly needsDecision: boolean
  /** Never contains `necessary`. */
  readonly granted: readonly string[]
}

export interface ConsentStoreOptions {
  readonly policy: ConsentPolicy
  readonly storage?: ConsentStorage
  readonly storageKey?: string
  /** Detected from `window` when omitted. */
  readonly environment?: "browser" | "server"
  readonly signals?: readonly PrivacySignal[]
  /** Runs once, in a browser, when no current record exists. */
  readonly migrate?: (storage: ConsentStorage, policy: ConsentPolicy) => ConsentRecord | null
  readonly now?: () => Date
  /** Days a decision stays valid before the visitor is asked again. */
  readonly maxAgeDays?: number
  /** A record read elsewhere, e.g. from a request cookie on the server. */
  readonly seed?: ConsentRecord | null
  /** Remove a category's declared items when its grant is withdrawn. On by default. */
  readonly sweep?: boolean
  readonly onDecision?: (record: ConsentRecord, previous: ConsentRecord | null) => void
}

export interface ConsentStore extends ConsentGate {
  readonly policy: ConsentPolicy
  getState(): ConsentState
  getServerState(): ConsentState
  acceptAll(via?: ConsentRecord["via"]): void
  rejectAll(via?: ConsentRecord["via"]): void
  /** Unknown ids are ignored. */
  save(granted: Iterable<string>, via?: ConsentRecord["via"]): void
  forget(): void
}

const NO_SIGNALS: readonly PrivacySignal[] = Object.freeze([])
const NOTHING: readonly string[] = Object.freeze([])

const SERVER_STATE: ConsentState = Object.freeze({
  resolved: false,
  record: null,
  signals: NO_SIGNALS,
  needsDecision: false,
  granted: NOTHING,
})

export function createConsentStore(options: ConsentStoreOptions): ConsentStore {
  const { policy } = options
  const key = options.storageKey ?? DEFAULT_STORAGE_KEY
  const now = options.now ?? (() => new Date())

  const inBrowser =
    (options.environment ?? (typeof window === "undefined" ? "server" : "browser")) === "browser"

  const storage = options.storage ?? (inBrowser ? browserStorage() : memoryStorage())

  const optional = optionalCategories(policy).map((category) => category.id)
  const optionalSet = new Set(optional)

  const byId = new Map<string, CategoryDeclaration>(policy.categories.map((c) => [c.id, c]))
  const answers = (record: ConsentRecord | null): record is ConsentRecord =>
    answersPolicy(record, policy, { maxAgeDays: options.maxAgeDays, now: now() })

  const listeners = new Set<() => void>()
  let state: ConsentState = SERVER_STATE
  let serverState: ConsentState = SERVER_STATE

  function resolveSignals(): readonly PrivacySignal[] {
    if (options.signals) return options.signals
    if (!inBrowser) return NO_SIGNALS
    return privacySignals()
  }

  function buildState(record: ConsentRecord | null): ConsentState {
    const signals = resolveSignals()
    const answered = answers(record)

    // An explicit decision outranks a browser signal in both directions.
    if (answered) {
      return Object.freeze({
        resolved: true,
        record,
        signals,
        needsDecision: false,
        granted: Object.freeze(record.granted.filter((id) => optionalSet.has(id))),
      })
    }

    // A signal answers for the visitor; nothing is written.
    if (signals.length > 0) {
      return Object.freeze({
        resolved: true,
        record: null,
        signals,
        needsDecision: false,
        granted: NOTHING,
      })
    }

    return Object.freeze({
      resolved: true,
      record: null,
      signals,
      needsDecision: asksAnything(policy),
      granted: NOTHING,
    })
  }

  function emit(): void {
    for (const listener of [...listeners]) listener()
  }

  function sweepWithdrawn(previous: readonly string[], next: readonly string[]): void {
    if (options.sweep === false || !inBrowser) return
    const withdrawn = previous.filter((id) => !next.includes(id))
    const items = withdrawn.flatMap((id) => byId.get(id)?.stores ?? [])
    if (items.length > 0) sweepStoredItems(items)
  }

  function commit(record: ConsentRecord | null): void {
    const next = buildState(record)
    // Identity is the change signal for `useSyncExternalStore`.
    if (sameState(state, next)) return
    sweepWithdrawn(state.granted, next.granted)
    state = next
    emit()
  }

  function readFromStorage(): void {
    if (!inBrowser) {
      if (options.seed !== undefined) {
        state = buildState(options.seed)
        serverState = state
      }
      return
    }
    const stored = parseRecord(storage.read(key))
    if (answers(stored)) {
      state = buildState(stored)
      return
    }
    const migrated = stored === null ? (options.migrate?.(storage, policy) ?? null) : null
    if (migrated && answers(migrated)) {
      storage.write(key, serialiseRecord(migrated))
      state = buildState(migrated)
      return
    }
    state = buildState(stored)
  }

  // Read in the constructor, not an effect, so the first client render is final.
  readFromStorage()
  sweepWithdrawn(optional, state.granted)

  function write(granted: readonly string[], via: ConsentRecord["via"]): void {
    const record: ConsentRecord = {
      version: policy.version,
      decidedAt: now().toISOString(),
      granted,
      via,
    }
    const previous = state.record
    storage.write(key, serialiseRecord(record))
    commit(record)
    options.onDecision?.(record, previous)
  }

  const store: ConsentStore = {
    policy,

    allows(category) {
      if (category === NECESSARY) return true
      return state.granted.includes(category)
    },

    status(category): ConsentStatus {
      if (category === NECESSARY) return "granted"
      if (state.granted.includes(category)) return "granted"
      if (!state.resolved) return "unknown"
      if (state.record || state.signals.length > 0) return "denied"
      return optionalSet.has(category) ? "unknown" : "denied"
    },

    record: () => state.record,

    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },

    getState: () => state,
    getServerState: () => serverState,

    acceptAll: (via = "banner") => write(Object.freeze([...optional]), via),
    rejectAll: (via = "banner") => write(NOTHING, via),

    save(granted, via = "preferences") {
      const kept = optional.filter((id) => new Set(granted).has(id))
      write(Object.freeze(kept), via)
    },

    forget() {
      storage.remove(key)
      commit(null)
    },
  }

  return store
}

function sameState(a: ConsentState, b: ConsentState): boolean {
  return (
    a.resolved === b.resolved &&
    a.needsDecision === b.needsDecision &&
    a.record?.decidedAt === b.record?.decidedAt &&
    a.record?.version === b.record?.version &&
    a.granted.length === b.granted.length &&
    a.granted.every((id, index) => id === b.granted[index]) &&
    a.signals.length === b.signals.length
  )
}
