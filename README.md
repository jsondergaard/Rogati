# Rogati

A consent banner that is denied until somebody says otherwise.

- `@jsondergaard/rogati-core` decides. No React, no DOM beyond guarded access.
- `@jsondergaard/rogati-react` asks. Provider, hooks, banner, preferences dialog.
- `@jsondergaard/rogati-vanilla` asks without a framework. One `mountConsent` call.

The gate is synchronous, safe to call before anything has rendered, and there
is no state in which an uninitialised one answers yes. Nothing is written to
the browser before the visitor decides, and what a category stores is removed
when its grant is withdrawn.

## Install

```sh
npm install @jsondergaard/rogati-core @jsondergaard/rogati-react
```

or, without React:

```sh
npm install @jsondergaard/rogati-core @jsondergaard/rogati-vanilla
```

## Declare what the site stores

```ts
import { definePolicy } from "@jsondergaard/rogati-core"

export const policy = definePolicy({
  version: "2026-09-18",
  necessaryStores: [
    { name: "session", medium: "cookie", holds: "Your sign-in.", lifetime: "Until you sign out" },
  ],
  categories: [
    {
      id: "analytics",
      stores: [
        { name: "ph_*", medium: "localStorage", holds: "A device id.", lifetime: "12 months" },
      ],
    },
  ],
})
```

A trailing `*` in a name matches any suffix. The dialog renders this table, the
sweep on withdrawal uses it, and the development audit compares the browser
against it and warns about anything undeclared.

Change what you collect, bump the version, and everybody is asked again.

## React

```tsx
import { ConsentPreferencesLink, ConsentSurface, RogatiProvider } from "@jsondergaard/rogati-react"

<RogatiProvider policy={policy}>
  <App />
  <footer><ConsentPreferencesLink /></footer>
  <ConsentSurface />
</RogatiProvider>
```

`<ConsentSurface position="top" blocking />` moves the banner or makes it modal.
`<Consented category="analytics">` renders its children only while granted, and
`useAllows("analytics")` is the same as a boolean.

A policy with no optional categories renders nothing: no banner, no footer link.

## Without React

```ts
import { mountConsent } from "@jsondergaard/rogati-vanilla"

mountConsent({ policy, preferencesLinks: "a[href='#storage']" })
```

## Gate what stores

```ts
import { consent } from "@jsondergaard/rogati-core"

if (consent().allows("analytics")) start()
```

Or let an adapter do it. Each one starts its tool the moment the category is
granted and stops it, and removes its storage, when the grant is withdrawn.

```ts
import { connectPostHog } from "@jsondergaard/rogati-core/posthog"
import { connectGoogleConsentMode } from "@jsondergaard/rogati-core/google-consent-mode"
import { connectPlausible } from "@jsondergaard/rogati-core/plausible"
import { connectFathom } from "@jsondergaard/rogati-core/fathom"
import { connectMetaPixel } from "@jsondergaard/rogati-core/meta-pixel"
import { connectScript } from "@jsondergaard/rogati-core/script"

connectPostHog({ token, load: () => import("posthog-js").then((m) => m.default) })
connectGoogleConsentMode({
  categories: { analytics_storage: "analytics", ad_storage: "marketing", ad_user_data: "marketing", ad_personalization: "marketing" },
})
connectPlausible({ domain: "example.com" })
connectFathom({ siteId: "ABCDEF" })
connectMetaPixel({ pixelId: "123" })
connectScript({ src: "https://vendor.example/tag.js", category: "marketing", sweeps: ["vendor_*"] })
```

PostHog is never imported by this package. The caller passes `load`, so the
dependency lives where it is declared. `beforeConsent: "inert"` initialises the
client early with memory persistence for feature flags, and `"anonymous"`
measures without storing anything.

## Store options

```ts
createConsentStore({
  policy,
  maxAgeDays: 365,
  storage: cookieStorage({ domain: ".example.com" }),
  onDecision: (record, previous) => log(record),
})
```

Pass `options` to `RogatiProvider` or `mountConsent` for the same fields.

Global Privacy Control and Do Not Track are read as a refusal and the banner
does not appear. An explicit grant in the dialog overrides the signal for that
site.

## Server rendering

Nothing renders on the server and the first client commit is already final, so
a visitor who decided last week never sees the banner, not even for a frame.

To render with the decision on the server, keep the record in a cookie and seed
the store from the request:

```ts
const seed = recordFromCookieHeader(request.headers.get("cookie"))
const store = createConsentStore({ policy, seed, storage: cookieStorage() })
```

## Theming

CSS variables only, with system-colour fallbacks. Set `--rogati-surface`,
`--rogati-text`, `--rogati-muted`, `--rogati-border`, `--rogati-accent` and
the rest listed at the top of the stylesheet on any element.

## Languages

English, Danish, Swedish, Norwegian and German ship. `copyFor(navigator.language)`
picks one, and `withCopy(englishCopy, { categories: { marketing: { ... } } })`
extends it.

## Contributing

```sh
cd web && pnpm install && pnpm check
```

To develop against a consuming site, `scripts/link-rogati.sh` symlinks this
checkout into it as `web/.rogati`, and the site aliases the three packages to
`.rogati/web/packages/*/src` in its bundler config.
