export interface ConsentStorage {
  read(key: string): string | null
  /** False when the write did not land. */
  write(key: string, value: string): boolean
  remove(key: string): void
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function memoryStorage(seed?: Record<string, string>): ConsentStorage {
  const map = new Map<string, string>(Object.entries(seed ?? {}))
  return {
    read: (key) => map.get(key) ?? null,
    write: (key, value) => {
      map.set(key, value)
      return true
    },
    remove: (key) => void map.delete(key),
  }
}

/** Wraps a `Storage`-shaped object so nothing can throw, including the getter. */
export function guarded(open: () => StorageLike | null | undefined): ConsentStorage {
  const resolve = (): StorageLike | null => {
    try {
      return open() ?? null
    } catch {
      return null
    }
  }

  return {
    read(key) {
      try {
        return resolve()?.getItem(key) ?? null
      } catch {
        return null
      }
    },
    write(key, value) {
      try {
        const storage = resolve()
        if (!storage) return false
        storage.setItem(key, value)
        return true
      } catch {
        return false
      }
    },
    remove(key) {
      try {
        resolve()?.removeItem(key)
      } catch {
        // Already unreadable.
      }
    },
  }
}

export function browserStorage(): ConsentStorage {
  return guarded(() => (typeof window === "undefined" ? null : window.localStorage))
}

export function browserSessionStorage(): ConsentStorage {
  return guarded(() => (typeof window === "undefined" ? null : window.sessionStorage))
}
