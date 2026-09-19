import { NECESSARY } from "./policy.js"
import type { ConsentRecord } from "./record.js"

export interface ConsentGate {
  /** True for `necessary` always, false for everything else until granted. */
  allows(category: string): boolean
  status(category: string): ConsentStatus
  record(): ConsentRecord | null
  subscribe(listener: () => void): () => void
}

export type ConsentStatus = "unknown" | "granted" | "denied"

/** The gate before a store exists, and on the server. Never says yes. */
export const deniedGate: ConsentGate = Object.freeze({
  allows: (category: string) => category === NECESSARY,
  status: (category: string): ConsentStatus =>
    category === NECESSARY ? "granted" : "unknown",
  record: () => null,
  subscribe: () => () => {},
})

let ambient: ConsentGate = deniedGate

/** The ambient gate, for code that cannot be handed one. */
export function consent(): ConsentGate {
  return ambient
}

/** Installs a gate. Returns a function that restores the previous one. */
export function installConsentGate(gate: ConsentGate): () => void {
  const previous = ambient
  ambient = gate
  return () => {
    if (ambient === gate) ambient = previous
  }
}
