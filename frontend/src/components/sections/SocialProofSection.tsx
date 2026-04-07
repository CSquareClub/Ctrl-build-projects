import { motion } from 'framer-motion'

import { Section } from '../ui/Section'

const stats = [
  {
    value: '2.8x',
    label: 'Increase in weekly focus hours',
  },
  {
    value: '-42%',
    label: 'Drop in distraction time',
  },
  {
    value: '89%',
    label: 'Users report stronger accountability',
  },
]

const badges = ['Productivity Boost', 'Distraction Shield', 'Accountability Network']

export function SocialProofSection() {
  return (
    <Section
      id="benefits"
      eyebrow="Proof That Works"
      title="Built to Help Students Finish What They Start"
      description="FocusRoom blends social accountability and real-time structure to turn scattered sessions into consistent progress."
    >
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="surface-card rounded-2xl p-5"
            >
              <p className="font-display text-4xl font-semibold text-[var(--text)]">{stat.value}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="surface-card rounded-2xl p-6">
          <h3 className="text-2xl font-semibold text-[var(--text)]">Why students keep coming back</h3>
          <p className="mt-3 text-[var(--muted)]">
            With live rooms, visible progress, and goal loops, FocusRoom removes the isolation that causes procrastination.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span key={badge} className="soft-pill rounded-full px-4 py-2 text-xs tracking-wide">
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}
