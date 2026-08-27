export type Theme = 'light' | 'dark'

export const THEME_KEY = 'crowdmix.theme'

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function readStoredTheme(): Theme | null {
  try {
    const raw = window.localStorage.getItem(THEME_KEY)
    return raw === 'light' || raw === 'dark' ? raw : null
  } catch {
    return null
  }
}

export function readDocumentTheme(): Theme {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.classList.contains('light') ? 'light' : 'dark'
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('light', theme === 'light')
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

export function persistTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Private mode can reject localStorage; the class still applies.
  }

  applyTheme(theme)
}

export function resolveInitialTheme(): Theme {
  return readStoredTheme() ?? getSystemTheme()
}
