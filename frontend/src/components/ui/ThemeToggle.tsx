import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'

type ThemeToggleProps = {
  theme: 'dark' | 'light'
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.92, rotate: -8 }}
      whileHover={{ scale: 1.04 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="theme-toggle-btn relative inline-flex h-11 w-11 items-center justify-center rounded-full p-2 transition-all duration-300"
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -20, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 20, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}
