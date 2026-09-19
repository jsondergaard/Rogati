import type { StoredItem } from "./policy.js"

type Matcher = (name: string) => boolean

/** A trailing `*` matches any suffix, for keys that embed a token. */
export function nameMatcher(names: readonly string[]): Matcher {
  const exact = new Set<string>()
  const prefixes: string[] = []
  for (const name of names) {
    if (name.endsWith("*")) prefixes.push(name.slice(0, -1))
    else exact.add(name)
  }
  return (name) => exact.has(name) || prefixes.some((prefix) => name.startsWith(prefix))
}

export function storageAreas(): Array<{ medium: "localStorage" | "sessionStorage"; area: Storage }> {
  if (typeof window === "undefined") return []
  const found: Array<{ medium: "localStorage" | "sessionStorage"; area: Storage }> = []
  for (const medium of ["localStorage", "sessionStorage"] as const) {
    try {
      const area = window[medium]
      if (area) found.push({ medium, area })
    } catch {
      // Blocked, so nothing is stored.
    }
  }
  return found
}

export function storageKeys(area: Storage): string[] {
  const keys: string[] = []
  try {
    for (let index = 0; index < area.length; index += 1) {
      const key = area.key(index)
      if (key) keys.push(key)
    }
  } catch {
    // Blocked, so nothing is stored.
  }
  return keys
}

export function cookieNames(): string[] {
  if (typeof document === "undefined") return []
  let existing: string
  try {
    existing = document.cookie
  } catch {
    return []
  }
  return existing
    .split(";")
    .map((entry) => entry.split("=")[0]?.trim() ?? "")
    .filter((name) => name !== "")
}

/** Expires the cookie on every domain it could have been set for. */
export function expireCookie(name: string): void {
  if (typeof document === "undefined") return
  const host = typeof location === "undefined" ? "" : location.hostname
  const parts = host.split(".")
  const domains = new Set([""])
  for (let index = 0; index < parts.length - 1; index += 1) {
    const domain = parts.slice(index).join(".")
    domains.add(domain)
    domains.add(`.${domain}`)
  }
  if (host) domains.add(host)
  for (const domain of domains) {
    const suffix = domain ? `; domain=${domain}` : ""
    try {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${suffix}`
    } catch {
      // Unwritable.
    }
  }
}

export function sweepMatching(
  matches: Matcher,
  media: readonly StoredItem["medium"][] = ["cookie", "localStorage", "sessionStorage"],
): void {
  for (const { medium, area } of storageAreas()) {
    if (!media.includes(medium)) continue
    for (const key of storageKeys(area).filter(matches)) {
      try {
        area.removeItem(key)
      } catch {
        // Already unreadable.
      }
    }
  }
  if (media.includes("cookie")) {
    for (const name of cookieNames().filter(matches)) expireCookie(name)
  }
}

/** Removes every declared item from the browser. */
export function sweepStoredItems(items: readonly StoredItem[]): void {
  for (const medium of ["cookie", "localStorage", "sessionStorage"] as const) {
    const names = items.filter((item) => item.medium === medium).map((item) => item.name)
    if (names.length > 0) sweepMatching(nameMatcher(names), [medium])
  }
}
