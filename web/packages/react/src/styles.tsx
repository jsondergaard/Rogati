import { consentStylesheet } from "@jsondergaard/rogati-core"

/** Rendered by the banner and the dialog, never the provider, so nothing lands in prerendered HTML. */
export function ConsentStyles() {
  return (
    <style href="rogati" precedence="rogati">
      {consentStylesheet}
    </style>
  )
}

export { consentStylesheet }
