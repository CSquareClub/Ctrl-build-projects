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
        y: -2,
      }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={[
        'surface-card relative rounded-2xl p-6 transition-all duration-200',
        'hover:shadow-[0_10px_24px_rgba(0,0,0,0.12)]',
        className,
      ].join(' ')}
    >
      {children}
    </motion.div>
  )
}
