import { type ConsentPolicy, type StoredItem, storedItems } from "./policy.js"
import { DEFAULT_STORAGE_KEY } from "./store.js"
import { cookieNames, nameMatcher, storageAreas, storageKeys } from "./sweep.js"

export interface UndeclaredItem {
  readonly name: string
  readonly medium: StoredItem["medium"]
}

export interface AuditOptions {
  readonly storageKey?: string
  /** Names or `prefix*` patterns to leave out of the report. */
  readonly ignore?: readonly string[]
}

/** Everything in the browser that the policy does not declare. Empty on the server. */
export function auditStorage(policy: ConsentPolicy, options: AuditOptions = {}): UndeclaredItem[] {
  const declared = storedItems(policy)
  const ignored = nameMatcher([options.storageKey ?? DEFAULT_STORAGE_KEY, ...(options.ignore ?? [])])
  const byMedium = (medium: StoredItem["medium"]) =>
    nameMatcher(declared.filter((item) => item.medium === medium).map((item) => item.name))

  const found: UndeclaredItem[] = []
  for (const { medium, area } of storageAreas()) {
    const known = byMedium(medium)
    for (const name of storageKeys(area)) {
      if (!known(name) && !ignored(name)) found.push({ name, medium })
    }
  }
  const knownCookies = byMedium("cookie")
  for (const name of cookieNames()) {
    if (!knownCookies(name) && !ignored(name)) found.push({ name, medium: "cookie" })
  }
  return found
}

/** Logs one warning naming every undeclared item. Returns what it found. */
export function warnUndeclaredStorage(
  policy: ConsentPolicy,
  options: AuditOptions = {},
): UndeclaredItem[] {
  const found = auditStorage(policy, options)
  if (found.length > 0 && typeof console !== "undefined") {
    const list = found.map((item) => `  ${item.medium}: ${item.name}`).join("\n")
    console.warn(`rogati: stored in this browser but not declared in the policy:\n${list}`)
  }
  return found
}
