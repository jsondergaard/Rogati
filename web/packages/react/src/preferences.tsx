import { NECESSARY, optionalCategories, type CategoryDeclaration, type StoredItem } from "@jsondergaard/rogati-core"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { categoryCopy } from "./copy.js"
import { useConsent } from "./context.js"
import { ConsentStyles } from "./styles.js"

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function ConsentPreferences() {
  const { state, copy, policy, preferencesOpen, closePreferences, save } = useConsent()
  const optional = optionalCategories(policy)

  if (!preferencesOpen) return null
  return (
    <PreferencesDialog
      // Keyed on the decision so the toggles reset each time it opens.
      key={state.record?.decidedAt ?? "undecided"}
      granted={state.granted}
      categories={policy.categories}
      optionalIds={optional.map((category) => category.id)}
      signals={state.signals}
      copy={copy}
      onClose={closePreferences}
      onSave={(granted) => {
        save(granted)
        closePreferences()
      }}
    />
  )
}

function PreferencesDialog({
  granted,
  categories,
  optionalIds,
  signals,
  copy,
  onClose,
  onSave,
}: {
  granted: readonly string[]
  categories: readonly CategoryDeclaration[]
  optionalIds: readonly string[]
  signals: readonly string[]
  copy: ReturnType<typeof useConsent>["copy"]
  onClose: () => void
  onSave: (granted: Iterable<string>) => void
}) {
  const [chosen, setChosen] = useState<readonly string[]>(granted)
  const headingId = useId()
  const bodyId = useId()
  const surface = useRef<HTMLDivElement | null>(null)

  const toggle = useCallback((id: string, on: boolean) => {
    setChosen((current) => (on ? [...current, id] : current.filter((entry) => entry !== id)))
  }, [])

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    // The dialog itself, not its first control.
    surface.current?.focus()
    return () => opener?.focus?.()
  }, [])

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== "Tab") return
      const container = surface.current
      if (!container) return
      const stops = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (stops.length === 0) return
      const first = stops[0]!
      const last = stops[stops.length - 1]!
      const active = document.activeElement
      // Trap Tab inside the dialog.
      if (event.shiftKey && (active === first || active === container)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  return (
    <div
      className="rogati rogati-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <ConsentStyles />
      <div
        ref={surface}
        className="rogati-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={bodyId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <h2 className="rogati-title" id={headingId}>
          {copy.dialogHeading}
        </h2>
        <p className="rogati-body" id={bodyId}>
          {copy.dialogBody}
        </p>

        {signals.length > 0 && (
          <p className="rogati-notice">
            {copy.signalNotice.replace(
              "{signal}",
              signals.map((signal) => copy.signalNames[signal] ?? signal).join(copy.signalJoin),
            )}
          </p>
        )}

        <ul className="rogati-categories">
          <Category
            id={NECESSARY}
            copy={copy}
            checked
            disabled
            note={copy.alwaysOn}
            stores={categories.find((c) => c.id === NECESSARY)?.stores ?? []}
            onChange={() => {}}
          />
          {optionalIds.map((id) => (
            <Category
              key={id}
              id={id}
              copy={copy}
              checked={chosen.includes(id)}
              disabled={false}
              stores={categories.find((c) => c.id === id)?.stores ?? []}
              onChange={(on) => toggle(id, on)}
            />
          ))}
        </ul>

        <div className="rogati-actions">
          <button type="button" className="rogati-choice" onClick={() => onSave([])}>
            {copy.rejectAll}
          </button>
          <button type="button" className="rogati-choice" onClick={() => onSave(optionalIds)}>
            {copy.acceptAll}
          </button>
          <button type="button" className="rogati-choice" onClick={() => onSave(chosen)}>
            {copy.save}
          </button>
          <button type="button" className="rogati-quiet" onClick={onClose}>
            {copy.close}
          </button>
        </div>
      </div>
    </div>
  )
}

function Category({
  id,
  copy,
  checked,
  disabled,
  note,
  stores,
  onChange,
}: {
  id: string
  copy: ReturnType<typeof useConsent>["copy"]
  checked: boolean
  disabled: boolean
  note?: string
  stores: readonly StoredItem[]
  onChange: (on: boolean) => void
}) {
  const inputId = useId()
  const noteId = useId()
  const text = categoryCopy(copy, id)
  return (
    <li className="rogati-category">
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-describedby={noteId}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <label className="rogati-category-name" htmlFor={inputId}>
        {text.title}
        {note ? <span className="rogati-always"> · {note}</span> : null}
      </label>
      <p className="rogati-category-note" id={noteId}>
        {text.description}
      </p>
      {stores.length > 0 && <Stores items={stores} copy={copy} />}
    </li>
  )
}

function Stores({ items, copy }: { items: readonly StoredItem[]; copy: ReturnType<typeof useConsent>["copy"] }) {
  return (
    <table className="rogati-stores">
      <caption>{copy.storesHeading}</caption>
      <thead>
        <tr>
          <th scope="col">{copy.columns.name}</th>
          <th scope="col">{copy.columns.medium}</th>
          <th scope="col">{copy.columns.holds}</th>
          <th scope="col">{copy.columns.lifetime}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={`${item.medium}:${item.name}`}>
            <td>
              <code>{item.name}</code>
            </td>
            <td>{copy.media[item.medium]}</td>
            <td>{item.holds}</td>
            <td>{item.lifetime}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
