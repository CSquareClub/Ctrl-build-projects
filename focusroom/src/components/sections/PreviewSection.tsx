import { motion } from 'framer-motion'
import { Flame, Timer, Users } from 'lucide-react'

import { flashcardMocks } from '../../mock/flashcards'
import { Section } from '../ui/Section'

const users = ['Ava', 'Noah', 'Mia', 'Liam', 'Sara']

export function PreviewSection() {
  return (
    <Section
      id="preview"
      eyebrow="Live Preview"
      title="A Dashboard That Keeps You Locked In"
      description="Monitor the live timer, room activity, and competition signals that keep momentum high through every session."
    >
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.6 }}
        className="surface-card rounded-3xl p-4 backdrop-blur-xl sm:p-6"
      >
        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="surface-card rounded-2xl p-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                <Timer className="h-4 w-4 text-[var(--accent)]" />
                Active Session Timer
              </p>
              <span className="success-pill rounded-full px-3 py-1 text-xs">Synchronized</span>
            </div>
            <p className="font-display text-6xl font-semibold text-[var(--text)]">31:42</p>
            <div className="mt-6 h-2 rounded-full bg-[var(--accent-soft)]">
              <motion.div
                className="primary-gradient-bg h-full rounded-full"
                animate={{ width: ['40%', '72%', '58%', '81%'] }}
                transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              />
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {flashcardMocks.map((card) => (
                <motion.article
                  key={card.id}
                  whileHover={{ y: -3, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] p-3"
                  style={{
                    backgroundImage: `linear-gradient(145deg, color-mix(in srgb, ${card.aura.from} 20%, transparent), color-mix(in srgb, ${card.aura.to} 18%, transparent))`,
                  }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">
                      {card.deck}
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">{card.mastery}% mastery</span>
                  </div>
                  <p className="line-clamp-2 text-xs font-medium text-[var(--text)]">{card.front}</p>
                  <p className="mt-2 line-clamp-1 text-[11px] text-[var(--muted)]">{card.back}</p>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--muted)]">
                    <span>Streak {card.streak}x</span>
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--card)]">
                      <div className="h-full rounded-full" style={{ width: `${card.mastery}%`, background: `linear-gradient(90deg, ${card.aura.from}, ${card.aura.to})` }} />
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="surface-card rounded-2xl p-4">
              <p className="mb-3 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                <Users className="h-4 w-4 text-[var(--accent)]" />
                Room Users
              </p>
              <ul className="space-y-2">
                {users.map((user) => (
                  <li key={user} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--text)]">
                    <span>{user}</span>
                    <span className="text-xs text-[var(--success)]">Focused</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="surface-card rounded-2xl p-4">
              <p className="mb-3 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                <Flame className="h-4 w-4 text-[var(--accent)]" />
                Leaderboard
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2 text-[var(--text)]">
                  <span>1. Noor</span>
                  <span className="text-[var(--accent)]">18h</span>
                </div>
                <div className="flex justify-between rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2 text-[var(--text)]">
                  <span>2. Ethan</span>
                  <span>16h</span>
                </div>
                <div className="flex justify-between rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2 text-[var(--text)]">
                  <span>3. You</span>
                  <span>15h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </Section>
  )
}
