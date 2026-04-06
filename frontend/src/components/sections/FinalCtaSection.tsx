import { motion } from 'framer-motion'

import { Button } from '../ui/Button'
import { Container } from '../ui/Container'

export function FinalCtaSection() {
  return (
    <section id="final-cta" className="w-full pb-20 pt-10 lg:pb-28">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55 }}
          className="surface-card relative overflow-hidden rounded-3xl p-8 text-center shadow-[0_0_70px_rgba(139,92,246,0.2)] backdrop-blur-xl sm:p-12"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,var(--accent-soft),transparent_35%),radial-gradient(circle_at_80%_70%,var(--accent-soft),transparent_35%)]" />
          <div className="relative">
            <p className="mb-4 text-xs uppercase tracking-[0.28em] text-[var(--accent)]">Ready to unlock deep work?</p>
            <h2 className="mx-auto text-balance font-display text-3xl font-semibold text-[var(--text)] sm:text-5xl">
              Start Your Focus Journey Today
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[var(--muted)]">
              Join thousands of students creating consistent results with collaborative focus sessions.
            </p>
            <div className="mt-8">
              <Button className="px-9 py-4 text-base" href="/login">
                Start Focusing Now
              </Button>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  )
}
