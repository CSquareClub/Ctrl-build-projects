import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary'

type ButtonProps = {
  children: ReactNode
  variant?: ButtonVariant
  href?: string
  className?: string
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'primary-gradient-bg bg-[length:200%_200%] text-[var(--on-primary)] shadow-[var(--hero-glow)] hover:bg-right hover:shadow-[var(--card-glow)]',
  secondary:
    'border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[var(--accent-soft)]',
}

export function Button({
  children,
  variant = 'primary',
  href = '#',
  className = '',
}: ButtonProps) {
  return (
    <motion.a
      href={href}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={[
        'inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold tracking-wide transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </motion.a>
  )
}
