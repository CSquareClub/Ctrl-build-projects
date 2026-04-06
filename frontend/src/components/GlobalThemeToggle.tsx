import { useEffect, useState } from 'react'

import { ThemeToggle } from './ui/ThemeToggle'
import { getStoredTheme, setTheme, subscribeTheme, toggleTheme, type ThemeMode } from '../lib/theme'

export function GlobalThemeToggle() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme())

  useEffect(() => {
    setThemeState(getStoredTheme())

    const unsubscribe = subscribeTheme((nextTheme) => {
      setThemeState(nextTheme)
    })

    return unsubscribe
  }, [])

  const handleToggle = () => {
    const nextTheme = toggleTheme(theme)
    setTheme(nextTheme)
    setThemeState(nextTheme)
  }

  return (
    <div className="fixed right-4 top-4 z-[80] sm:right-6 sm:top-5">
      <ThemeToggle theme={theme} onToggle={handleToggle} />
    </div>
  )
}
