export interface CategoryCopy {
  readonly title: string
  readonly description: string
}

export interface ConsentCopy {
  readonly regionLabel: string
  readonly heading: string
  readonly body: string
  readonly accept: string
  readonly reject: string
  readonly preferences: string

  readonly dialogHeading: string
  readonly dialogBody: string
  readonly save: string
  readonly acceptAll: string
  readonly rejectAll: string
  readonly close: string
  readonly alwaysOn: string
  readonly signalJoin: string

  /** `{signal}` is substituted. */
  readonly signalNotice: string
  readonly signalNames: Readonly<Record<string, string>>

  readonly footerLink: string

  readonly storesHeading: string
  readonly columns: { readonly name: string; readonly medium: string; readonly holds: string; readonly lifetime: string }
  readonly media: { readonly cookie: string; readonly localStorage: string; readonly sessionStorage: string }

  readonly categories: Readonly<Record<string, CategoryCopy>>
}

const signalNames = {
  globalPrivacyControl: "Global Privacy Control",
  doNotTrack: "Do Not Track",
}

export const englishCopy: ConsentCopy = {
  regionLabel: "Storage choices",
  heading: "Storage in this browser",
  body: "This site can store things in your browser it does not need to work. Whether it does is your choice, and the footer has the same choice again later.",
  accept: "Accept",
  reject: "Reject",
  preferences: "Choose in detail",

  dialogHeading: "Storage choices",
  dialogBody:
    "Necessary storage keeps the site working and stays on. Everything else is off until you turn it on.",
  save: "Save",
  acceptAll: "Accept all",
  rejectAll: "Reject all",
  close: "Close",
  alwaysOn: "Always on",
  signalJoin: " and ",

  signalNotice:
    "Your browser is sending {signal}, so nothing optional is on. Turning something on here applies to this site only.",
  signalNames,

  footerLink: "Storage choices",

  storesHeading: "Stored in your browser",
  columns: { name: "Name", medium: "Where", holds: "Holds", lifetime: "Lasts" },
  media: { cookie: "Cookie", localStorage: "Local storage", sessionStorage: "Session storage" },

  categories: {
    necessary: {
      title: "Necessary",
      description: "Signing in, and remembering the answer you give here.",
    },
    analytics: {
      title: "Analytics",
      description: "Counts visits and which pages people open.",
    },
  },
}

export const danishCopy: ConsentCopy = {
  regionLabel: "Valg om lagring",
  heading: "Lagring i denne browser",
  body: "Siden kan gemme ting i din browser, som den ikke skal bruge for at virke. Om den gør det, bestemmer du, og det samme valg står i bunden af siden senere.",
  accept: "Acceptér",
  reject: "Afvis",
  preferences: "Vælg i detaljer",

  dialogHeading: "Valg om lagring",
  dialogBody:
    "Nødvendig lagring holder siden i gang og forbliver slået til. Alt andet er slået fra, indtil du slår det til.",
  save: "Gem",
  acceptAll: "Acceptér alt",
  rejectAll: "Afvis alt",
  close: "Luk",
  alwaysOn: "Altid til",
  signalJoin: " og ",

  signalNotice:
    "Din browser sender {signal}, så intet valgfrit er slået til. Slår du noget til her, gælder det kun denne side.",
  signalNames,

  footerLink: "Valg om lagring",

  storesHeading: "Gemt i din browser",
  columns: { name: "Navn", medium: "Hvor", holds: "Indeholder", lifetime: "Varighed" },
  media: { cookie: "Cookie", localStorage: "Lokal lagring", sessionStorage: "Sessionslagring" },

  categories: {
    necessary: {
      title: "Nødvendige",
      description: "Login, og at huske det svar du giver her.",
    },
    analytics: {
      title: "Analyse",
      description: "Tæller besøg og hvilke sider folk åbner.",
    },
  },
}

export const swedishCopy: ConsentCopy = {
  regionLabel: "Val om lagring",
  heading: "Lagring i den här webbläsaren",
  body: "Den här webbplatsen kan spara saker i din webbläsare som den inte behöver för att fungera. Om den gör det bestämmer du, och samma val finns i sidfoten senare.",
  accept: "Acceptera",
  reject: "Avvisa",
  preferences: "Välj i detalj",

  dialogHeading: "Val om lagring",
  dialogBody:
    "Nödvändig lagring håller webbplatsen igång och är alltid på. Allt annat är av tills du slår på det.",
  save: "Spara",
  acceptAll: "Acceptera alla",
  rejectAll: "Avvisa alla",
  close: "Stäng",
  alwaysOn: "Alltid på",
  signalJoin: " och ",

  signalNotice:
    "Din webbläsare skickar {signal}, så inget valfritt är på. Slår du på något här gäller det bara den här webbplatsen.",
  signalNames,

  footerLink: "Val om lagring",

  storesHeading: "Sparat i din webbläsare",
  columns: { name: "Namn", medium: "Var", holds: "Innehåller", lifetime: "Varaktighet" },
  media: { cookie: "Cookie", localStorage: "Lokal lagring", sessionStorage: "Sessionslagring" },

  categories: {
    necessary: {
      title: "Nödvändigt",
      description: "Inloggning, och att komma ihåg svaret du ger här.",
    },
    analytics: {
      title: "Analys",
      description: "Räknar besök och vilka sidor folk öppnar.",
    },
  },
}

export const norwegianCopy: ConsentCopy = {
  regionLabel: "Valg om lagring",
  heading: "Lagring i denne nettleseren",
  body: "Dette nettstedet kan lagre ting i nettleseren din som det ikke trenger for å virke. Om det gjør det, bestemmer du, og det samme valget finnes i bunnteksten senere.",
  accept: "Godta",
  reject: "Avvis",
  preferences: "Velg i detalj",

  dialogHeading: "Valg om lagring",
  dialogBody:
    "Nødvendig lagring holder nettstedet i gang og er alltid på. Alt annet er av til du slår det på.",
  save: "Lagre",
  acceptAll: "Godta alt",
  rejectAll: "Avvis alt",
  close: "Lukk",
  alwaysOn: "Alltid på",
  signalJoin: " og ",

  signalNotice:
    "Nettleseren din sender {signal}, så ingenting valgfritt er på. Slår du på noe her, gjelder det bare dette nettstedet.",
  signalNames,

  footerLink: "Valg om lagring",

  storesHeading: "Lagret i nettleseren din",
  columns: { name: "Navn", medium: "Hvor", holds: "Inneholder", lifetime: "Varighet" },
  media: { cookie: "Informasjonskapsel", localStorage: "Lokal lagring", sessionStorage: "Øktlagring" },

  categories: {
    necessary: {
      title: "Nødvendig",
      description: "Innlogging, og å huske svaret du gir her.",
    },
    analytics: {
      title: "Analyse",
      description: "Teller besøk og hvilke sider folk åpner.",
    },
  },
}

export const germanCopy: ConsentCopy = {
  regionLabel: "Speicher-Einstellungen",
  heading: "Speicherung in diesem Browser",
  body: "Diese Website kann Dinge in Ihrem Browser speichern, die sie zum Funktionieren nicht braucht. Ob sie das tut, entscheiden Sie, und dieselbe Wahl finden Sie später in der Fußzeile.",
  accept: "Akzeptieren",
  reject: "Ablehnen",
  preferences: "Im Detail wählen",

  dialogHeading: "Speicher-Einstellungen",
  dialogBody:
    "Notwendige Speicherung hält die Website am Laufen und bleibt an. Alles andere ist aus, bis Sie es einschalten.",
  save: "Speichern",
  acceptAll: "Alle akzeptieren",
  rejectAll: "Alle ablehnen",
  close: "Schließen",
  alwaysOn: "Immer an",
  signalJoin: " und ",

  signalNotice:
    "Ihr Browser sendet {signal}, daher ist nichts Optionales an. Was Sie hier einschalten, gilt nur für diese Website.",
  signalNames,

  footerLink: "Speicher-Einstellungen",

  storesHeading: "In Ihrem Browser gespeichert",
  columns: { name: "Name", medium: "Wo", holds: "Enthält", lifetime: "Dauer" },
  media: { cookie: "Cookie", localStorage: "Lokaler Speicher", sessionStorage: "Sitzungsspeicher" },

  categories: {
    necessary: {
      title: "Notwendig",
      description: "Anmeldung, und das Merken der Antwort, die Sie hier geben.",
    },
    analytics: {
      title: "Analyse",
      description: "Zählt Besuche und welche Seiten geöffnet werden.",
    },
  },
}

export const copies: Readonly<Record<string, ConsentCopy>> = {
  en: englishCopy,
  da: danishCopy,
  sv: swedishCopy,
  nb: norwegianCopy,
  nn: norwegianCopy,
  no: norwegianCopy,
  de: germanCopy,
}

/** Copy for a BCP 47 tag such as "da-DK", falling back to English. */
export function copyFor(locale: string | null | undefined): ConsentCopy {
  const language = (locale ?? "").trim().toLowerCase().split(/[-_]/)[0] ?? ""
  return copies[language] ?? englishCopy
}

type Loose<T> = { [K in keyof T]?: T[K] | undefined }

export type DeepPartialCopy = Loose<
  Omit<ConsentCopy, "categories" | "signalNames" | "columns" | "media">
> & {
  categories?: Readonly<Record<string, CategoryCopy>> | undefined
  signalNames?: Readonly<Record<string, string>> | undefined
  columns?: Loose<ConsentCopy["columns"]> | undefined
  media?: Loose<ConsentCopy["media"]> | undefined
}

export function withCopy(base: ConsentCopy, overrides: DeepPartialCopy): ConsentCopy {
  return {
    ...base,
    ...(stripUndefined(overrides) as Partial<ConsentCopy>),
    categories: { ...base.categories, ...(overrides.categories ?? {}) },
    signalNames: { ...base.signalNames, ...(overrides.signalNames ?? {}) },
    columns: { ...base.columns, ...stripUndefined(overrides.columns ?? {}) } as ConsentCopy["columns"],
    media: { ...base.media, ...stripUndefined(overrides.media ?? {}) } as ConsentCopy["media"],
  }
}

// With `exactOptionalPropertyTypes`, spreading an explicit `undefined` would blank a field.
function stripUndefined<T extends object>(value: T): Partial<T> {
  const kept: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) kept[key] = entry
  }
  return kept as Partial<T>
}

export function categoryCopy(copy: ConsentCopy, id: string): CategoryCopy {
  return copy.categories[id] ?? { title: id, description: "" }
}
