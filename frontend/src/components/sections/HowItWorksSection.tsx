import { motion } from 'framer-motion'
import { ArrowRight, ChartNoAxesColumn, DoorOpen, Focus } from 'lucide-react'

import { Section } from '../ui/Section'

const steps = [
  {
    title: 'Join Room',
    description: 'Find a public room or invite classmates to your private sprint space.',
    icon: DoorOpen,
  },
  {
    title: 'Focus',
    description: 'Start the session timer and lock into distraction-free deep work blocks.',
    icon: Focus,
  },
  {
    title: 'Track Progress',
    description: 'Review analytics and streaks to compound your consistency every day.',
    icon: ChartNoAxesColumn,
  },
]

export function HowItWorksSection() {
  return (
    <Section
      id="how-it-works"
      eyebrow="Simple Flow"
      title="From Room Entry to Deep Work in Minutes"
      description="A frictionless 3-step experience designed to make staying focused feel natural and rewarding."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isLast = index === steps.length - 1

          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="surface-card relative rounded-2xl p-6"
            >
              <p className="soft-pill mb-4 inline-flex rounded-full px-3 py-1 text-xs tracking-wide">
                Step {index + 1}
              </p>
              <div className="icon-soft mb-4 inline-flex rounded-xl p-2.5">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--text)]">{step.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{step.description}</p>

              {!isLast ? (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="pointer-events-none absolute -right-5 top-1/2 hidden -translate-y-1/2 text-[var(--accent)] lg:block"
                >
                  <ArrowRight className="h-6 w-6" />
                </motion.div>
              ) : null}
            </motion.div>
          )
        })}
      </div>
    </Section>
  )
}
