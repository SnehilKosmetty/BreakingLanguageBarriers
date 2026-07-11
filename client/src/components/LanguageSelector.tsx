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

export function LanguageSelector({
  label,
  displayLabel,
  dotColor,
  value,
  languages,
  disabled,
  onChange,
}: LanguageSelectorProps) {
  const indian = languages.filter((l) => l.region === 'IN')
  const international = languages.filter((l) => l.region !== 'IN')

  return (
    <div className="language-selector">
      <label htmlFor={label} className="lang-label">
        <span className={`lang-dot lang-dot-${dotColor}`} aria-hidden="true" />
        {displayLabel}
      </label>
      <select
        id={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Choose a language</option>
        {indian.length > 0 && (
          <optgroup label="Indian Languages">
            {indian.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name} ({lang.nativeName})
              </option>
            ))}
          </optgroup>
        )}
        {international.length > 0 && (
          <optgroup label="International">
            {international.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name} ({lang.nativeName})
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  )
}
