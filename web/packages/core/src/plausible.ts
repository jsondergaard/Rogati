import type { ConsentGate } from "./gate.js"
import { consent } from "./gate.js"
import { connectScript, type GatedScriptHandle } from "./script.js"

export interface PlausibleOptions {
  readonly domain: string
  /** Defaults to Plausible's hosted script. */
  readonly src?: string
  readonly category?: string
  /** Extra script attributes, e.g. `{ "data-api": "/api/event" }`. */
  readonly attributes?: Readonly<Record<string, string>>
}

export function connectPlausible(
  options: PlausibleOptions,
  gate: ConsentGate = consent(),
): GatedScriptHandle {
  return connectScript(
    {
      src: options.src ?? "https://plausible.io/js/script.js",
      category: options.category ?? "analytics",
      defer: true,
      attributes: { "data-domain": options.domain, ...(options.attributes ?? {}) },
      sweeps: ["plausible_ignore"],
    },
    gate,
  )
}
