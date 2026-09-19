import { consent, type ConsentGate } from "./gate.js"
import { connectScript, type GatedScriptHandle } from "./script.js"
import { nameMatcher, sweepMatching } from "./sweep.js"

export type Fbq = (...args: unknown[]) => void

export interface MetaPixelOptions {
  readonly pixelId: string
  /** Defaults to "marketing". */
  readonly category?: string
  readonly src?: string
  /** Sent after init. Defaults to a PageView. */
  readonly initialEvents?: readonly (readonly unknown[])[]
}

function queue(): Fbq {
  const w = window as unknown as { fbq?: Fbq & { queue?: unknown[]; loaded?: boolean; version?: string }; _fbq?: Fbq }
  if (w.fbq) return w.fbq
  const fbq = function fbq(this: unknown) {
    // eslint-disable-next-line prefer-rest-params
    const args = arguments
    const target = fbq as Fbq & { callMethod?: (...a: unknown[]) => void; queue: unknown[] }
    if (target.callMethod) target.callMethod.apply(target, [...args])
    else target.queue.push(args)
  } as Fbq & { queue: unknown[]; loaded: boolean; version: string; push: Fbq }
  fbq.queue = []
  fbq.loaded = true
  fbq.version = "2.0"
  fbq.push = fbq
  w.fbq = fbq
  w._fbq = fbq
  return fbq
}

/** Loads the pixel once the category is granted, revokes and sweeps `_fbp`/`_fbc` when withdrawn. */
export function connectMetaPixel(
  options: MetaPixelOptions,
  gate: ConsentGate = consent(),
): GatedScriptHandle {
  const category = options.category ?? "marketing"
  let initialised = false
  const fbq = typeof window === "undefined" ? null : queue()

  const handle = connectScript(
    {
      src: options.src ?? "https://connect.facebook.net/en_US/fbevents.js",
      category,
      onLoad: () => {
        if (!fbq || initialised || !gate.allows(category)) return
        fbq("consent", "grant")
        fbq("init", options.pixelId)
        for (const event of options.initialEvents ?? [["track", "PageView"]]) fbq(...event)
        initialised = true
      },
      onRemove: () => {
        fbq?.("consent", "revoke")
        initialised = false
        sweepMatching(nameMatcher(["_fbp", "_fbc"]), ["cookie"])
      },
    },
    gate,
  )
  if (fbq && !gate.allows(category)) fbq("consent", "revoke")
  return handle
}
