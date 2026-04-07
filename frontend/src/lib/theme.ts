export type ThemeMode = 'dark' | 'light'

const THEME_STORAGE_KEY = 'focusroom-theme'
const THEME_EVENT_NAME = 'focusroom-theme-change'

const isThemeMode = (value: string | null): value is ThemeMode => value === 'dark' || value === 'light'

export const getStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark'

  const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemeMode(saved) ? saved : 'dark'
}

export const applyTheme = (theme: ThemeMode) => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export const setTheme = (theme: ThemeMode) => {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  applyTheme(theme)
  window.dispatchEvent(new CustomEvent(THEME_EVENT_NAME, { detail: theme }))
}

export const toggleTheme = (current: ThemeMode) => (current === 'dark' ? 'light' : 'dark')

export const subscribeTheme = (onThemeChange: (theme: ThemeMode) => void) => {
  if (typeof window === 'undefined') return () => {}

  const onCustomThemeChange = (event: Event) => {
    const customEvent = event as CustomEvent<ThemeMode>
    if (customEvent.detail === 'dark' || customEvent.detail === 'light') {
      onThemeChange(customEvent.detail)
    }
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return
    const next = event.newValue
    if (next === 'dark' || next === 'light') {
      onThemeChange(next)
    }
  }

  window.addEventListener(THEME_EVENT_NAME, onCustomThemeChange)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(THEME_EVENT_NAME, onCustomThemeChange)
    window.removeEventListener('storage', onStorage)
  }
}
