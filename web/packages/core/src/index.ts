export {
  NECESSARY,
  asksAnything,
  definePolicy,
  optionalCategories,
  storedItems,
  type CategoryDeclaration,
  type ConsentPolicy,
  type PolicyInput,
  type StoredItem,
} from "./policy.js"

export {
  answersPolicy,
  parseRecord,
  serialiseRecord,
  type AnswerOptions,
  type ConsentRecord,
} from "./record.js"

export {
  consent,
  deniedGate,
  installConsentGate,
  type ConsentGate,
  type ConsentStatus,
} from "./gate.js"

export { privacySignals, type PrivacySignal, type SignalSources } from "./signals.js"

export {
  browserSessionStorage,
  browserStorage,
  guarded,
  memoryStorage,
  type ConsentStorage,
  type StorageLike,
} from "./storage.js"

export {
  cookieStorage,
  parseCookieHeader,
  recordFromCookieHeader,
  type CookieStorageOptions,
} from "./cookie.js"

export {
  DEFAULT_STORAGE_KEY,
  createConsentStore,
  type ConsentState,
  type ConsentStore,
  type ConsentStoreOptions,
} from "./store.js"

export { expireCookie, sweepMatching, sweepStoredItems, nameMatcher } from "./sweep.js"

export {
  auditStorage,
  warnUndeclaredStorage,
  type AuditOptions,
  type UndeclaredItem,
} from "./audit.js"

export {
  categoryCopy,
  copies,
  copyFor,
  danishCopy,
  englishCopy,
  germanCopy,
  norwegianCopy,
  swedishCopy,
  withCopy,
  type CategoryCopy,
  type ConsentCopy,
  type DeepPartialCopy,
} from "./copy.js"

export { consentStylesheet } from "./css.js"
