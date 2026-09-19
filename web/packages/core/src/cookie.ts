import { parseRecord, type ConsentRecord } from "./record.js"
import type { ConsentStorage } from "./storage.js"
import { expireCookie } from "./sweep.js"

export function parseCookieHeader(header: string | null | undefined): Map<string, string> {
  const found = new Map<string, string>()
  if (!header) return found
  for (const entry of header.split(";")) {
    const separator = entry.indexOf("=")
    if (separator === -1) continue
    const name = entry.slice(0, separator).trim()
    if (!name) continue
    const raw = entry.slice(separator + 1).trim()
    try {
      found.set(name, decodeURIComponent(raw))
    } catch {
      found.set(name, raw)
    }
  }
  return found
}

export interface CookieStorageOptions {
  /** Set to share one decision across subdomains, e.g. ".example.com". */
  readonly domain?: string
  readonly path?: string
  /** Defaults to 365. */
  readonly maxAgeDays?: number
  readonly secure?: boolean
  readonly sameSite?: "Lax" | "Strict" | "None"
}

/** Stores the record in a first-party cookie, so a server can read it too. */
export function cookieStorage(options: CookieStorageOptions = {}): ConsentStorage {
  const path = options.path ?? "/"
  const maxAge = Math.round((options.maxAgeDays ?? 365) * 86400)
  const sameSite = options.sameSite ?? "Lax"
  const secure = options.secure ?? sameSite === "None"

  const attributes = (): string => {
    let out = `; path=${path}; max-age=${maxAge}; SameSite=${sameSite}`
    if (options.domain) out += `; domain=${options.domain}`
    if (secure) out += "; Secure"
    return out
  }

  return {
    read(key) {
      if (typeof document === "undefined") return null
      try {
        return parseCookieHeader(document.cookie).get(key) ?? null
      } catch {
        return null
      }
    },
    write(key, value) {
      if (typeof document === "undefined") return false
      try {
        document.cookie = `${key}=${encodeURIComponent(value)}${attributes()}`
        return parseCookieHeader(document.cookie).get(key) === value
      } catch {
        return false
      }
    },
    remove(key) {
      if (typeof document === "undefined") return
      try {
        if (options.domain) {
          document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${options.domain}`
        }
        document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`
        expireCookie(key)
      } catch {
        // Unwritable.
      }
    },
  }
}

/** The decision from a request's Cookie header, for rendering on the server. */
export function recordFromCookieHeader(
  header: string | null | undefined,
  key = "rogati.consent",
): ConsentRecord | null {
  return parseRecord(parseCookieHeader(header).get(key) ?? null)
}
