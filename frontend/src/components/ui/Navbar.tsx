import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

import { ThemeToggle } from './ThemeToggle'

type NavbarProps = {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

export function Navbar({ theme, onToggleTheme }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12)
    }

    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={[
        'absolute left-0 top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'bg-[var(--nav-bg)]'
          : 'bg-transparent',
      ].join(' ')}
    >
      <div className="absolute right-6 top-4 m-0">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </motion.header>
  )
}
