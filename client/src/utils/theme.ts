export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'blb-theme'

export function getPreferredTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Ignore
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Ignore
  }
}

export function toggleTheme(): ThemeMode {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}
