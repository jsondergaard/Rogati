export type PrivacySignal = "globalPrivacyControl" | "doNotTrack"

interface SignalCarrier {
  globalPrivacyControl?: unknown
  doNotTrack?: unknown
  msDoNotTrack?: unknown
}

interface WindowSignalCarrier {
  doNotTrack?: unknown
}

// "1" is the header value; Safari once reported `true` and IE "yes".
function doNotTrackIsOn(navigator: SignalCarrier, window: WindowSignalCarrier): boolean {
  const candidates = [navigator.doNotTrack, navigator.msDoNotTrack, window.doNotTrack]
  return candidates.some((value) => value === "1" || value === "yes" || value === true)
}

export interface SignalSources {
  navigator?: SignalCarrier | undefined
  window?: WindowSignalCarrier | undefined
}

/** Browser-sent refusals (GPC, DNT). Empty on the server. */
export function privacySignals(sources?: SignalSources): PrivacySignal[] {
  const nav =
    sources?.navigator ??
    (typeof navigator === "undefined" ? undefined : (navigator as SignalCarrier))
  const win =
    sources?.window ?? (typeof window === "undefined" ? undefined : (window as WindowSignalCarrier))
  if (!nav && !win) return []

  const found: PrivacySignal[] = []
  const gpc = nav?.globalPrivacyControl
  if (gpc === true || gpc === "1") found.push("globalPrivacyControl")
  if (nav && win ? doNotTrackIsOn(nav, win) : doNotTrackIsOn(nav ?? {}, win ?? {})) {
    found.push("doNotTrack")
  }
  return found
}
