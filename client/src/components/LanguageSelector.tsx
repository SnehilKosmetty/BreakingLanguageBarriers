import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Language } from '../types'

interface LanguageSelectorProps {
  label: string
  displayLabel: string
  dotColor: 'red' | 'green'
  value: string
  languages: Language[]
  disabled?: boolean
  onChange: (code: string) => void
}

function matchesQuery(lang: Language, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    lang.name.toLowerCase().includes(q) ||
    lang.nativeName.toLowerCase().includes(q) ||
    lang.code.toLowerCase().includes(q)
  )
}

export function LanguageSelector({
  label,
  displayLabel,
  dotColor,
  value,
  languages,
  disabled,
  onChange,
}: LanguageSelectorProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const selected = languages.find((l) => l.code === value)

  const filtered = useMemo(() => {
    const list = languages.filter((l) => matchesQuery(l, query))
    return {
      indian: list.filter((l) => l.region === 'IN'),
      international: list.filter((l) => l.region !== 'IN'),
    }
  }, [languages, query])

  const hasResults = filtered.indian.length > 0 || filtered.international.length > 0

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const pick = (code: string) => {
    onChange(code)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="language-selector language-selector--search" ref={rootRef}>
      <label htmlFor={`${label}-search`} className="lang-label">
        <span className={`lang-dot lang-dot-${dotColor}`} aria-hidden="true" />
        {displayLabel}
      </label>

      <button
        type="button"
        id={label}
        className="lang-picker-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        {selected ? `${selected.name} (${selected.nativeName})` : 'Choose a language'}
        <span className="lang-picker-caret" aria-hidden="true">▾</span>
      </button>

      {open && !disabled && (
        <div className="lang-picker-panel" role="listbox" id={listId} aria-label={displayLabel}>
          <input
            id={`${label}-search`}
            type="search"
            className="lang-picker-search"
            placeholder="Search languages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            aria-controls={listId}
          />

          {!hasResults && (
            <p className="lang-picker-empty">No languages match your search.</p>
          )}

          {filtered.indian.length > 0 && (
            <div className="lang-picker-group">
              <span className="lang-picker-group-label">Indian languages</span>
              {filtered.indian.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={lang.code === value}
                  className={`lang-picker-option ${lang.code === value ? 'selected' : ''}`}
                  onClick={() => pick(lang.code)}
                >
                  <span className="lang-picker-name">{lang.name}</span>
                  <span className="lang-picker-native">{lang.nativeName}</span>
                </button>
              ))}
            </div>
          )}

          {filtered.international.length > 0 && (
            <div className="lang-picker-group">
              <span className="lang-picker-group-label">International</span>
              {filtered.international.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={lang.code === value}
                  className={`lang-picker-option ${lang.code === value ? 'selected' : ''}`}
                  onClick={() => pick(lang.code)}
                >
                  <span className="lang-picker-name">{lang.name}</span>
                  <span className="lang-picker-native">{lang.nativeName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
