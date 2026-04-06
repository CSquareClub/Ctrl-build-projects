import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

type FeatureCardProps = {
  icon: LucideIcon
  title: string
  description: string
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={[
        'group relative h-full cursor-pointer select-none rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-left shadow-[var(--card-shadow)] transition-all duration-200 ease-out',
        'hover:scale-105 active:scale-95',
        'hover:bg-gradient-to-r hover:from-cyan-500 hover:to-purple-600',
        'active:bg-gradient-to-r active:from-cyan-500 active:to-purple-600',
      ].join(' ')}
    >
      <div className="icon-soft mb-4 inline-flex rounded-xl p-2.5 shadow-[var(--hero-glow)] transition-all duration-200 ease-out group-hover:bg-transparent group-hover:text-white group-active:bg-transparent group-active:text-white group-hover:shadow-[0_0_20px_rgba(139,92,246,0.5)]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mb-2 text-base font-semibold transition-colors duration-200 ease-out group-hover:text-white group-active:text-white sm:text-lg">{title}</h3>
      <p className="text-sm leading-relaxed text-[var(--muted)] opacity-80 transition-colors duration-200 ease-out group-hover:text-white group-active:text-white">
        {description}
      </p>

      <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--accent-soft)] blur-2xl transition-opacity duration-300 group-hover:opacity-80 group-active:opacity-90" />
    </motion.button>
  )
}
