import type { ConsentGate } from "./gate.js"
import { consent } from "./gate.js"
import { connectScript, type GatedScriptHandle } from "./script.js"

export interface FathomOptions {
  readonly siteId: string
  /** Defaults to Fathom's hosted script. */
  readonly src?: string
  readonly category?: string
  readonly attributes?: Readonly<Record<string, string>>
}

export function connectFathom(
  options: FathomOptions,
  gate: ConsentGate = consent(),
): GatedScriptHandle {
  return connectScript(
    {
      src: options.src ?? "https://cdn.usefathom.com/script.js",
      category: options.category ?? "analytics",
      defer: true,
      attributes: { "data-site": options.siteId, ...(options.attributes ?? {}) },
      sweeps: ["blockfathomtracking"],
    },
    gate,
  )
}
