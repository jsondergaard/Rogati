import { useEffect, useId, useState } from "react"
import { useConsent } from "./context.js"
import { ConsentStyles } from "./styles.js"

export type BannerPosition = "bottom" | "bottom-left" | "bottom-right" | "top"

export interface ConsentBannerProps {
  /** Defaults to "bottom". */
  readonly position?: BannerPosition
  /** Dims the page and traps focus until the visitor answers. Off by default. */
  readonly blocking?: boolean
}

export function ConsentBanner({ position = "bottom", blocking = false }: ConsentBannerProps) {
  const { state, copy, acceptAll, rejectAll, openPreferences } = useConsent()
  const visible = state.resolved && state.needsDecision
  const headingId = useId()
  const bodyId = useId()

  if (!visible) return null
  const modal = blocking
    ? { role: "dialog", "aria-modal": true, "aria-labelledby": headingId, "aria-describedby": bodyId }
    : { role: "region", "aria-label": copy.regionLabel }
  return (
    <div
      className="rogati rogati-banner"
      data-position={position}
      {...(blocking ? { "data-blocking": "" } : {})}
      {...modal}
    >
      <ConsentStyles />
      <div className="rogati-card">
        {blocking ? <TrapFocus /> : <Announcement text={`${copy.heading}. ${copy.body}`} />}
        <h2 className="rogati-title" id={headingId}>
          {copy.heading}
        </h2>
        <p className="rogati-body" id={bodyId}>
          {copy.body}
        </p>
        <div className="rogati-actions">
          {/* Reject first, so a keyboard reader reaches it no later. */}
          <button type="button" className="rogati-choice" onClick={rejectAll}>
            {copy.reject}
          </button>
          <button type="button" className="rogati-choice" onClick={acceptAll}>
            {copy.accept}
          </button>
          <button type="button" className="rogati-quiet" onClick={openPreferences}>
            {copy.preferences}
          </button>
        </div>
      </div>
    </div>
  )
}

// A live region only announces content added after it is watched.
function Announcement({ text }: { text: string }) {
  const [said, setSaid] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => setSaid(text), 120)
    return () => clearTimeout(timer)
  }, [text])
  return (
    <div className="rogati-offscreen" role="status" aria-live="polite">
      {said}
    </div>
  )
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'

function TrapFocus() {
  useEffect(() => {
    const card = document.querySelector<HTMLElement>(".rogati-banner[data-blocking] .rogati-card")
    if (!card) return
    const opener = document.activeElement as HTMLElement | null
    card.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return
      const stops = [...card.querySelectorAll<HTMLElement>(FOCUSABLE)]
      const first = stops[0]
      const last = stops[stops.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      opener?.focus?.()
    }
  }, [])
  return null
}
