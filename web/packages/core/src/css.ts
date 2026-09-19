// Every colour is a `--rogati-*` variable with a CSS system-colour fallback.
export const consentStylesheet = `
.rogati {
  --_surface: var(--rogati-surface, Canvas);
  --_text: var(--rogati-text, CanvasText);
  --_muted: var(--rogati-muted, GrayText);
  --_border: var(--rogati-border, ButtonBorder);
  --_radius: var(--rogati-radius, 0.75rem);
  --_shadow: var(--rogati-shadow, 0 1px 2px rgb(0 0 0 / 0.06), 0 12px 32px rgb(0 0 0 / 0.14));
  --_accent: var(--rogati-accent, AccentColor);
  --_gap: var(--rogati-gap, 1rem);

  box-sizing: border-box;
  color: var(--_text);
  font: inherit;
  font-family: var(--rogati-font, inherit);
}
.rogati *, .rogati *::before, .rogati *::after { box-sizing: inherit; }

.rogati-banner {
  position: fixed;
  z-index: var(--rogati-z, 60);
  inset-inline: 0;
  inset-block-end: 0;
  display: flex;
  justify-content: center;
  padding: var(--rogati-inset, 1rem);
  pointer-events: none;
}
.rogati-banner > * { pointer-events: auto; }
.rogati-banner[data-position="top"] { inset-block-start: 0; inset-block-end: auto; }
.rogati-banner[data-position="bottom-left"] { justify-content: flex-start; }
.rogati-banner[data-position="bottom-right"] { justify-content: flex-end; }
.rogati-banner[data-blocking] {
  inset: 0;
  align-items: flex-end;
  pointer-events: auto;
  background: var(--rogati-scrim, rgb(0 0 0 / 0.45));
}
.rogati-banner[data-blocking][data-position="top"] { align-items: flex-start; }

.rogati-card {
  width: 100%;
  max-width: var(--rogati-width, 34rem);
  padding: 1.25rem;
  background: var(--_surface);
  border: 1px solid var(--_border);
  border-radius: var(--_radius);
  box-shadow: var(--_shadow);
}

.rogati-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
}
.rogati-body {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--_muted);
}
.rogati-notice {
  margin: 0.75rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--_muted);
}

.rogati-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: var(--_gap);
}

/* Accept and reject share one class: equal prominence is required. */
.rogati-choice {
  flex: 1 1 8rem;
  min-height: 2.5rem;
  padding: 0.5rem 1rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--_text);
  background: var(--rogati-choice-surface, transparent);
  border: 1px solid var(--_border);
  border-radius: calc(var(--_radius) - 0.375rem);
  cursor: pointer;
}
.rogati-choice:hover { background: var(--rogati-choice-hover, color-mix(in srgb, var(--_text) 7%, transparent)); }

.rogati-quiet {
  min-height: 2.5rem;
  padding: 0.5rem 0.75rem;
  font: inherit;
  font-size: 0.875rem;
  color: var(--_muted);
  background: none;
  border: 1px solid transparent;
  border-radius: calc(var(--_radius) - 0.375rem);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.rogati-quiet:hover { color: var(--_text); }

.rogati :focus-visible {
  outline: 2px solid var(--rogati-ring, var(--_accent));
  outline-offset: 2px;
}

.rogati-scrim {
  position: fixed;
  inset: 0;
  z-index: var(--rogati-z, 60);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: var(--rogati-scrim, rgb(0 0 0 / 0.45));
}
.rogati-dialog {
  width: 100%;
  max-width: var(--rogati-dialog-width, 32rem);
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: 1.25rem;
  background: var(--_surface);
  border: 1px solid var(--_border);
  border-radius: var(--_radius);
  box-shadow: var(--_shadow);
}

.rogati-categories {
  margin: var(--_gap) 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.75rem;
}
.rogati-category {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--_border);
  border-radius: calc(var(--_radius) - 0.25rem);
}
.rogati-category input { margin: 0.2rem 0 0; }
.rogati-category-name { font-size: 0.875rem; font-weight: 600; }
.rogati-category-note { grid-column: 2; margin: 0; font-size: 0.8125rem; line-height: 1.5; color: var(--_muted); }
.rogati-always { font-size: 0.75rem; font-weight: 500; color: var(--_muted); }

.rogati-stores {
  grid-column: 2;
  width: 100%;
  margin: 0.5rem 0 0;
  border-collapse: collapse;
  font-size: 0.75rem;
  line-height: 1.4;
}
.rogati-stores caption { text-align: left; font-weight: 600; padding-bottom: 0.25rem; color: var(--_muted); }
.rogati-stores th, .rogati-stores td {
  padding: 0.25rem 0.5rem 0.25rem 0;
  text-align: left;
  vertical-align: top;
  border-top: 1px solid var(--_border);
}
.rogati-stores th { font-weight: 500; color: var(--_muted); border-top: 0; }
.rogati-stores code { font-family: var(--rogati-mono, ui-monospace, monospace); font-size: 0.7rem; }

.rogati-link {
  font: inherit;
  color: inherit;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.rogati-offscreen {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

@media (min-width: 30rem) {
  .rogati-choice { flex: 0 1 auto; min-width: 7rem; }
}

@media (prefers-reduced-motion: no-preference) {
  .rogati-card { animation: rogati-rise 180ms ease-out both; }
  .rogati-dialog { animation: rogati-rise 140ms ease-out both; }
}
@keyframes rogati-rise {
  from { opacity: 0; transform: translateY(0.75rem); }
  to { opacity: 1; transform: none; }
}
`
