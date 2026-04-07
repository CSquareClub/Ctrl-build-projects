import { motion } from 'framer-motion'
import { Clock3, Sparkles, Users } from 'lucide-react'

import { Button } from '../ui/Button'
import { Container } from '../ui/Container'

const floatingCards = [
  {
    title: 'Live Sprint',
    detail: '25:00 deep work',
    icon: Clock3,
    className: 'left-4 top-10 sm:left-10',
  },
  {
    title: 'Room Active',
    detail: '18 students online',
    icon: Users,
    className: 'right-5 top-20 sm:right-16',
  },
  {
    title: 'AI Coach',
    detail: '2 distractions blocked',
    icon: Sparkles,
    className: 'left-10 bottom-8 sm:left-28',
  },
]

export function HeroSection() {
  return (
    <section className="relative isolate flex min-h-screen w-full items-center overflow-hidden">
      <Container className="grid min-h-screen w-full grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center lg:text-left"
        >
          <p className="soft-pill mb-5 inline-flex items-center rounded-full px-4 py-1 text-xs uppercase tracking-[0.26em]">
            FocusRoom for Students
          </p>
          <h1 className="text-balance font-display text-5xl font-semibold leading-tight sm:text-6xl lg:text-7xl">
            <span className="primary-gradient-text">Focus Better, Together</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base text-[var(--muted)] sm:text-lg lg:mx-0">
            Join virtual focus rooms, stay accountable, and achieve more. Build unstoppable study momentum with live sessions,
            AI coaching, and streak-driven motivation.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
            <Button href="/login" className="w-full sm:w-auto">
              Start Focusing
            </Button>
            <Button href="/login" variant="secondary" className="w-full sm:w-auto">
              Join a Room
            </Button>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-[var(--muted)] lg:justify-start">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--success)]" />
              12,000+ active students
            </span>
            <span>4.9 average room rating</span>
          </div>
        </motion.div>

        <div className="relative min-h-[360px] sm:min-h-[430px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
            transition={{ duration: 0.75, delay: 0.15, ease: 'easeOut' }}
            className="surface-card absolute inset-x-5 top-10 rounded-3xl p-5 backdrop-blur-2xl sm:inset-x-10"
          >
            <div className="mb-5 flex items-center justify-between">
              <p className="soft-pill rounded-full px-3 py-1 text-xs">Live Sprint</p>
              <p className="success-pill rounded-full px-3 py-1 text-xs">In Focus</p>
            </div>
            <p className="font-display text-5xl font-bold text-[var(--text)] drop-shadow-[var(--hero-glow)] sm:text-6xl">24:18</p>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-[var(--accent-soft)]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '74%' }}
                transition={{ duration: 1.6, delay: 0.4 }}
                className="primary-gradient-bg h-full rounded-full"
              />
            </div>
            <div className="mt-7 grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-10 rounded-xl border border-[var(--border)] bg-[var(--accent-soft)]" />
              ))}
            </div>
          </motion.div>

          {floatingCards.map((card, index) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.14, duration: 0.55 }}
                className={`surface-card absolute ${card.className} rounded-2xl px-4 py-3 backdrop-blur-xl`}
              >
                <p className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                  <Icon className="h-4 w-4 text-[var(--accent)]" />
                  {card.title}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">{card.detail}</p>
              </motion.div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
