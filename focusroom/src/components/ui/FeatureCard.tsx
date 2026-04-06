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
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={[
        'group relative h-full cursor-pointer select-none rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-left shadow-[var(--card-shadow)] transition-all duration-200 ease-out',
        'hover:bg-[var(--bg-elev)] active:scale-95',
      ].join(' ')}
    >
      <div className="icon-soft mb-4 inline-flex rounded-xl p-2.5 transition-all duration-200 ease-out group-hover:text-[var(--text)] group-active:text-[var(--text)]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mb-2 text-base font-semibold transition-colors duration-200 ease-out group-hover:text-[var(--text)] group-active:text-[var(--text)] sm:text-lg">{title}</h3>
      <p className="text-sm leading-relaxed text-[var(--muted)] opacity-80 transition-colors duration-200 ease-out group-hover:text-[var(--muted)] group-active:text-[var(--muted)]">
        {description}
      </p>
    </motion.button>
  )
}
