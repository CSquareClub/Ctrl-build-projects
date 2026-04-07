import type { ReactNode } from 'react'
import { Container } from './Container'

type SectionProps = {
  id?: string
  eyebrow?: string
  title: string
  description?: string
  children: ReactNode
}

export function Section({ id, eyebrow, title, description, children }: SectionProps) {
  return (
    <section id={id} className="relative w-full py-16 lg:py-24">
      <Container>
        <div className="mx-auto mb-10 max-w-2xl text-center">
          {eyebrow ? (
            <p className="soft-pill mx-auto mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em]">{eyebrow}</p>
          ) : null}
          <h2 className="text-balance text-3xl font-semibold text-[var(--text)] sm:text-4xl lg:text-5xl">{title}</h2>
          {description ? (
            <p className="mt-4 text-pretty text-base text-[var(--muted)] sm:text-lg">{description}</p>
          ) : null}
        </div>
        {children}
      </Container>
    </section>
  )
}
