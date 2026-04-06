import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type GlassCardProps = {
  children: ReactNode
  className?: string
}

export function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <motion.div
      whileHover={{
        y: -8,
        scale: 1.02,
        rotateX: 3,
        rotateY: -3,
      }}
      transition={{ type: 'spring', stiffness: 230, damping: 20 }}
      className={[
        'group surface-card relative rounded-2xl p-6 backdrop-blur-xl transition-all duration-300',
        'shadow-[0_18px_45px_rgba(15,23,42,0.32)] hover:shadow-[0_0_40px_var(--accent-soft)]',
        className,
      ].join(' ')}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_20%_30%,var(--accent-soft),transparent_55%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">{children}</div>
    </motion.div>
  )
}
