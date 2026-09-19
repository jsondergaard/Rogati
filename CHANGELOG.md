# Changelog

## 1.0.0

First release.

- `@jsondergaard/rogati-core`: a synchronous consent gate that is denied until somebody says otherwise, a policy declaring what the site stores, and a store that reads its decision before the first render.
- `@jsondergaard/rogati-react`: provider, hooks, banner and preferences dialog for React 19.
- `@jsondergaard/rogati-vanilla`: the same banner and dialog with no framework, via `mountConsent`.
- Adapters for PostHog, Google Consent Mode v2, Plausible, Fathom and Meta Pixel, plus a generic gated `connectScript`.
- Withdrawing a category removes its declared cookies and storage keys.
- `maxAgeDays` re-asks once a decision is older than that, and `onDecision` reports each decision with the one before it.
- `auditStorage` and `warnUndeclaredStorage` report browser storage the policy does not declare. The React provider runs the audit outside production.
- `cookieStorage` keeps the record in a first-party cookie, optionally across subdomains, and `recordFromCookieHeader` plus the store's `seed` option let a server render with the decision.
- Global Privacy Control and Do Not Track are read as a refusal.
- Copy in English, Danish, Swedish, Norwegian and German, with `copyFor(locale)`.
