import {
  createConsentStore,
  installConsentGate,
  warnUndeclaredStorage,
  type ConsentPolicy,
  type ConsentState,
  type ConsentStore,
  type ConsentStoreOptions,
} from "@jsondergaard/rogati-core"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { englishCopy, type ConsentCopy } from "./copy.js"

interface Rogati {
  readonly store: ConsentStore
  readonly copy: ConsentCopy
  readonly preferencesOpen: boolean
  openPreferences(): void
  closePreferences(): void
}

const RogatiContext = createContext<Rogati | null>(null)

export interface RogatiProviderProps {
  readonly policy?: ConsentPolicy
  readonly store?: ConsentStore
  readonly options?: Omit<ConsentStoreOptions, "policy">
  readonly copy?: ConsentCopy
  readonly installGate?: boolean
  /** Warn about storage the policy does not declare. Defaults to on outside production. */
  readonly audit?: boolean
  readonly children?: ReactNode
}

declare const process: { env: Record<string, string | undefined> } | undefined

function developing(): boolean {
  try {
    return typeof process !== "undefined" && process?.env["NODE_ENV"] !== "production"
  } catch {
    return false
  }
}

export function RogatiProvider({
  policy,
  store: given,
  options,
  copy = englishCopy,
  installGate = true,
  audit,
  children,
}: RogatiProviderProps) {
  // Built in the first render so the first commit already knows the decision.
  // `useState`, not `useMemo`: React may discard a memo.
  const [built] = useState(() => {
    if (given) return given
    if (!policy) {
      throw new Error("RogatiProvider needs either a policy or a store.")
    }
    return createConsentStore({ policy, ...options })
  })
  const store = given ?? built

  useEffect(() => {
    if (!installGate) return
    return installConsentGate(store)
  }, [installGate, store])

  useEffect(() => {
    if (!(audit ?? developing())) return
    const check = () => {
      const timer = setTimeout(() => warnUndeclaredStorage(store.policy), 1500)
      return () => clearTimeout(timer)
    }
    let cancel = check()
    const unsubscribe = store.subscribe(() => {
      cancel()
      cancel = check()
    })
    return () => {
      cancel()
      unsubscribe()
    }
  }, [audit, store])

  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const openPreferences = useCallback(() => setPreferencesOpen(true), [])
  const closePreferences = useCallback(() => setPreferencesOpen(false), [])

  const value = useMemo<Rogati>(
    () => ({ store, copy, preferencesOpen, openPreferences, closePreferences }),
    [store, copy, preferencesOpen, openPreferences, closePreferences],
  )

  return <RogatiContext.Provider value={value}>{children}</RogatiContext.Provider>
}

function useRogati(): Rogati {
  const value = useContext(RogatiContext)
  if (!value) throw new Error("useConsent was called outside a RogatiProvider.")
  return value
}

export interface UseConsent {
  readonly state: ConsentState
  readonly copy: ConsentCopy
  readonly policy: ConsentPolicy
  readonly preferencesOpen: boolean
  allows(category: string): boolean
  acceptAll(): void
  rejectAll(): void
  save(granted: Iterable<string>): void
  openPreferences(): void
  closePreferences(): void
}

export function useConsent(): UseConsent {
  const { store, copy, preferencesOpen, openPreferences, closePreferences } = useRogati()

  const state = useSyncExternalStore(store.subscribe, store.getState, store.getServerState)

  const allows = useCallback(
    (category: string) => store.allows(category),
    // `state` on purpose: `allows` reads through the store.
    [store, state],
  )

  return {
    state,
    copy,
    policy: store.policy,
    preferencesOpen,
    allows,
    acceptAll: () => store.acceptAll("banner"),
    rejectAll: () => store.rejectAll("banner"),
    save: (granted) => store.save(granted, "preferences"),
    openPreferences,
    closePreferences,
  }
}

export function useConsentStore(): ConsentStore {
  return useRogati().store
}

/** Whether one category is currently allowed, kept current. */
export function useAllows(category: string): boolean {
  const { store } = useRogati()
  return useSyncExternalStore(
    store.subscribe,
    () => store.allows(category),
    () => category === "necessary",
  )
}

export interface ConsentedProps {
  readonly category: string
  readonly fallback?: ReactNode
  readonly children?: ReactNode
}

/** Renders its children only while the category is granted. */
export function Consented({ category, fallback = null, children }: ConsentedProps) {
  return <>{useAllows(category) ? children : fallback}</>
}
