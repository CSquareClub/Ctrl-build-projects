import { Sidebar } from '../components/Sidebar'

type SidebarFeaturePageProps = {
  title: string
  description: string
}

export function SidebarFeaturePage({ title, description }: SidebarFeaturePageProps) {
  return (
    <div className="min-h-screen w-full bg-[#020b1f] text-slate-100">
      <Sidebar />

      <main className="ml-72 p-6">
        <header className="mb-6 rounded-2xl border border-cyan-300/15 bg-[#081833] p-5">
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-slate-300">{description}</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-cyan-300/15 bg-[#081833] p-5">
            <h2 className="text-base font-semibold text-cyan-200">Live Module</h2>
            <p className="mt-2 text-sm text-slate-300">
              This section is active and route-isolated, so sidebar highlighting will not overlap with other items.
            </p>
          </article>

          <article className="rounded-2xl border border-cyan-300/15 bg-[#081833] p-5">
            <h2 className="text-base font-semibold text-cyan-200">Next Upgrade</h2>
            <p className="mt-2 text-sm text-slate-300">
              Add custom widgets, data sources, and actions specific to this sidebar feature.
            </p>
          </article>
        </section>
      </main>
    </div>
  )
}
