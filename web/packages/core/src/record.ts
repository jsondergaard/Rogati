import { NECESSARY, type ConsentPolicy } from "./policy.js"

export interface ConsentRecord {
  readonly version: string
  /** ISO 8601. */
  readonly decidedAt: string
  /** Never includes `necessary`. */
  readonly granted: readonly string[]
  readonly via: "banner" | "preferences"
}

/** Null for any malformed shape; a partial record is worse than none. */
export function parseRecord(raw: string | null): ConsentRecord | null {
  if (!raw) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof value !== "object" || value === null) return null

  const candidate = value as Partial<Record<keyof ConsentRecord, unknown>>
  if (typeof candidate.version !== "string" || candidate.version === "") return null
  if (typeof candidate.decidedAt !== "string") return null
  if (!Array.isArray(candidate.granted)) return null
  if (candidate.granted.some((id) => typeof id !== "string")) return null
  const via = candidate.via === "preferences" ? "preferences" : "banner"

  return {
    version: candidate.version,
    decidedAt: candidate.decidedAt,
    granted: candidate.granted.filter((id): id is string => id !== NECESSARY),
    via,
  }
}

export function serialiseRecord(record: ConsentRecord): string {
  return JSON.stringify(record)
}

export interface AnswerOptions {
  /** Days a decision stays valid. Omitted means indefinitely. */
  readonly maxAgeDays?: number | undefined
  readonly now?: Date | undefined
}

export function answersPolicy(
  record: ConsentRecord | null,
  policy: ConsentPolicy,
  options: AnswerOptions = {},
): record is ConsentRecord {
  if (record === null || record.version !== policy.version) return false
  if (options.maxAgeDays === undefined) return true
  const decided = Date.parse(record.decidedAt)
  if (Number.isNaN(decided)) return false
  const now = options.now ?? new Date()
  return now.getTime() - decided < options.maxAgeDays * 86_400_000
}
