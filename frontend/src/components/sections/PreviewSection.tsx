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
                  className="relative overflow-hidden rounded-2xl border border-[var(--border)] p-3.5"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: `color-mix(in srgb, ${card.aura.from} 70%, var(--border))`,
                    backgroundImage: `radial-gradient(circle at top right, color-mix(in srgb, ${card.aura.to} 24%, transparent), transparent 38%), linear-gradient(160deg, color-mix(in srgb, ${card.aura.from} 22%, var(--card)), color-mix(in srgb, ${card.aura.to} 18%, var(--card)))`,
                    boxShadow: `0 18px 34px color-mix(in srgb, ${card.aura.from} 14%, transparent), inset 0 1px 0 color-mix(in srgb, ${card.aura.from} 32%, transparent)`,
                  }}
                >
                  <div
                    className="absolute left-0 right-0 top-0 h-1"
                    style={{ background: `linear-gradient(90deg, ${card.aura.from}, ${card.aura.to})` }}
                  />
                  <div
                    className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl"
                    style={{ background: `color-mix(in srgb, ${card.aura.to} 32%, transparent)` }}
                  />

                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${card.aura.from}, ${card.aura.to})` }}
                      />
                      <span
                        className="rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] shadow-sm"
                        style={{
                          borderColor: `color-mix(in srgb, ${card.aura.from} 64%, var(--border))`,
                          background: `linear-gradient(90deg, color-mix(in srgb, ${card.aura.from} 30%, var(--bg-elev)), color-mix(in srgb, ${card.aura.to} 24%, var(--bg-elev)))`,
                          color: `color-mix(in srgb, ${card.aura.from} 82%, var(--text))`,
                        }}
                      >
                        {card.deck}
                      </span>
                    </div>
                    <span
                      className="rounded-full border px-2 py-1 text-[10px] font-medium"
                      style={{
                        borderColor: `color-mix(in srgb, ${card.aura.to} 50%, var(--border))`,
                        background: `color-mix(in srgb, ${card.aura.to} 14%, var(--bg-elev))`,
                        color: `color-mix(in srgb, ${card.aura.to} 72%, var(--text))`,
                      }}
                    >
                      {card.mastery}% mastery
                    </span>
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: `color-mix(in srgb, ${card.aura.from} 60%, var(--muted))` }}>Question</p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-[var(--text)]">{card.front}</p>
                  <div
                    className="mt-2 rounded-xl border px-2.5 py-2 text-[11px] leading-relaxed"
                    style={{
                      borderColor: `color-mix(in srgb, ${card.aura.to} 38%, var(--border))`,
                      background: `color-mix(in srgb, ${card.aura.to} 10%, var(--bg-elev))`,
                      color: `color-mix(in srgb, ${card.aura.to} 68%, var(--text))`,
                    }}
                  >
                    <span className="mr-1 font-semibold uppercase tracking-[0.12em]">Answer</span>
                    <span className="line-clamp-2">{card.back}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--muted)]">
                    <span style={{ color: `color-mix(in srgb, ${card.aura.from} 58%, var(--muted))` }}>Streak {card.streak}x</span>
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--bg-elev)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${card.mastery}%`,
                          background: `linear-gradient(90deg, ${card.aura.from}, ${card.aura.to})`,
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
