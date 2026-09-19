/** The one category that is never refused. */
export const NECESSARY = "necessary"

export interface StoredItem {
  readonly name: string
  readonly medium: "cookie" | "localStorage" | "sessionStorage"
  readonly holds: string
  readonly lifetime: string
}

export interface CategoryDeclaration {
  readonly id: string
  /** Only `necessary` may be required. */
  readonly required?: boolean
  readonly stores?: readonly StoredItem[]
}

export interface ConsentPolicy {
  /** Bump whenever what is collected changes; everybody is asked again. */
  readonly version: string
  readonly categories: readonly CategoryDeclaration[]
}

export interface PolicyInput {
  readonly version: string
  readonly categories?: readonly CategoryDeclaration[]
  readonly necessaryStores?: readonly StoredItem[]
}

export function definePolicy(input: PolicyInput): ConsentPolicy {
  const declared = input.categories ?? []
  const seen = new Set<string>()

  for (const category of declared) {
    if (seen.has(category.id)) {
      throw new Error(`rogati: the category "${category.id}" is declared twice.`)
    }
    seen.add(category.id)
    if (category.required && category.id !== NECESSARY) {
      throw new Error(
        `rogati: "${category.id}" is marked required. Only "${NECESSARY}" may be, ` +
          `because a category the visitor cannot refuse is not one they consented to.`,
      )
    }
  }

  const necessary: CategoryDeclaration = {
    id: NECESSARY,
    required: true,
    stores: input.necessaryStores ?? declared.find((c) => c.id === NECESSARY)?.stores ?? [],
  }

  return {
    version: input.version,
    categories: [necessary, ...declared.filter((category) => category.id !== NECESSARY)],
  }
}

export function optionalCategories(policy: ConsentPolicy): readonly CategoryDeclaration[] {
  return policy.categories.filter((category) => !category.required)
}

/** A site with nothing optional renders no banner. */
export function asksAnything(policy: ConsentPolicy): boolean {
  return optionalCategories(policy).length > 0
}

export function storedItems(policy: ConsentPolicy): readonly StoredItem[] {
  return policy.categories.flatMap((category) => category.stores ?? [])
}
