import { useEffect } from 'react'

export function ThemeSync() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('focusroom-theme')
    const useDark = savedTheme ? savedTheme === 'dark' : true
    document.documentElement.classList.toggle('dark', useDark)
  }, [])

  return null
}
