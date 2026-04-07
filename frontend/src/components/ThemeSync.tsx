import { useEffect } from 'react'

import { applyTheme, getStoredTheme } from '../lib/theme'

export function ThemeSync() {
  useEffect(() => {
    applyTheme(getStoredTheme())
  }, [])

  return null
}
