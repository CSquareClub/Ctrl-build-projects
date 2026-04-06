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
            <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {flashcardMocks.slice(0, 4).map((card) => (
                <motion.article
                  key={card.id}
                  whileHover={{ y: -3, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"
                  style={{
                    borderLeftWidth: 2,
                    borderLeftColor: `color-mix(in srgb, ${card.aura.from} 38%, var(--border))`,
                    backgroundImage: `linear-gradient(160deg, color-mix(in srgb, ${card.aura.from} 12%, var(--card)), color-mix(in srgb, ${card.aura.to} 7%, var(--card)))`,
                    boxShadow: `inset 0 1px 0 color-mix(in srgb, ${card.aura.from} 22%, transparent)`,
                  }}
                >
                  <div
                    className="absolute left-0 right-0 top-0 h-px"
                    style={{ background: `color-mix(in srgb, ${card.aura.to} 24%, var(--border))` }}
                  />

                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className="rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.15em]"
                      style={{
                        borderColor: `color-mix(in srgb, ${card.aura.from} 42%, var(--border))`,
                        background: `color-mix(in srgb, ${card.aura.from} 14%, var(--bg-elev))`,
                        color: 'var(--text)',
                      }}
                    >
                      {card.deck}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: `color-mix(in srgb, ${card.aura.from} 42%, var(--muted))` }}
                    >
                      {card.mastery}% mastery
                    </span>
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Question</p>
                  <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-[var(--text)]">{card.front}</p>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--muted)]">
                    <span>Streak {card.streak}x</span>
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--bg-elev)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${card.mastery}%`,
                          background: `linear-gradient(90deg, color-mix(in srgb, ${card.aura.from} 74%, var(--accent)), color-mix(in srgb, ${card.aura.from} 52%, var(--accent)))`,
                        }}
                      />
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
                  <li
                    key={user}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)]"
                    style={{
                      background: 'linear-gradient(120deg, color-mix(in srgb, var(--accent) 8%, var(--card)), var(--card))',
                    }}
                  >
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
                <div className="flex justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--text)]">
                  <span>1. Noor</span>
                  <span className="text-[var(--accent)]">18h</span>
                </div>
                <div className="flex justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--text)]">
                  <span>2. Ethan</span>
                  <span>16h</span>
                </div>
                <div className="flex justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--text)]">
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
