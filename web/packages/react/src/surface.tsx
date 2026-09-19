import { asksAnything } from "@jsondergaard/rogati-core"
import type { ReactNode } from "react"
import { ConsentBanner, type ConsentBannerProps } from "./banner.js"
import { useConsent } from "./context.js"
import { ConsentPreferences } from "./preferences.js"

export function ConsentSurface(props: ConsentBannerProps) {
  const { policy } = useConsent()
  if (!asksAnything(policy)) return null
  return (
    <>
      <ConsentBanner {...props} />
      <ConsentPreferences />
    </>
  )
}

export interface ConsentPreferencesLinkProps {
  readonly className?: string
  readonly children?: ReactNode
}

export function ConsentPreferencesLink({ className, children }: ConsentPreferencesLinkProps) {
  const { policy, copy, openPreferences } = useConsent()
  if (!asksAnything(policy)) return null
  return (
    <button
      type="button"
      className={className ?? "rogati rogati-link"}
      onClick={openPreferences}
    >
      {children ?? copy.footerLink}
    </button>
  )
}
