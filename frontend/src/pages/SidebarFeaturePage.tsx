import { Sidebar } from '../components/Sidebar'

type SidebarFeaturePageProps = {
  title: string
  description: string
}

export function SidebarFeaturePage({ title, description }: SidebarFeaturePageProps) {
  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />

      <main className="p-4 sm:p-6 lg:ml-72">
        <header className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-base font-semibold text-[var(--text)]">Live Module</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              This section is active and route-isolated, so sidebar highlighting will not overlap with other items.
            </p>
          </article>

          <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-base font-semibold text-[var(--text)]">Next Upgrade</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Add custom widgets, data sources, and actions specific to this sidebar feature.
            </p>
          </article>
        </section>
      </main>
    </div>
  )
}
