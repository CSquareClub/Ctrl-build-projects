import { MapPin, MessageCircle, Navigation, Star, Video } from 'lucide-react'
import { useState } from 'react'

import { Sidebar } from '../components/Sidebar'
import { educators } from '../mock/educators'

export function NearbyEducatorsPage() {
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {}
    educators.forEach((educator) => {
      defaults[educator.name] = educator.availableSlots[0] || ''
    })
    return defaults
  })

  const handleSlotChange = (educatorName: string, slot: string) => {
    setSelectedSlots((prev) => ({ ...prev, [educatorName]: slot }))
  }

  const handleBookSlot = (educatorName: string) => {
    const slot = selectedSlots[educatorName]
    if (!slot) {
      window.alert('Please select a time slot first.')
      return
    }
    window.alert(`Your class is booked at ${slot}`)
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="pointer-events-none absolute inset-0 mesh-bg" />

      <Sidebar />

      <main className="relative p-4 sm:p-6 lg:ml-72 lg:p-8">
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {educators.map((educator) => {
            const isNearCu = educator.name === 'CU Adda Coaching Classes'
            const isTopRated = educator.rating >= 4.8

            return (
              <article
                key={educator.name}
                className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {educator.demoAvailable && (
                    <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                      Demo Available
                    </span>
                  )}
                  {isTopRated && (
                    <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                      Top Rated
                    </span>
                  )}
                  {isNearCu && (
                    <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                      Near CU
                    </span>
                  )}
                </div>

                <h2 className="mt-3 text-lg font-semibold text-[var(--text)]">{educator.name}</h2>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-1 text-[var(--muted)]">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {educator.rating.toFixed(1)}
                  </span>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-1 text-[var(--muted)]">{educator.category}</span>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-1 text-[var(--muted)]">{educator.fee}</span>
                </div>

                <p className="mt-3 flex items-start gap-2 text-sm text-[var(--muted)]">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
                  {educator.address}
                </p>

                <p className="mt-2 text-sm text-[var(--muted)]">
                  <span className="font-medium text-[var(--text)]">Mode:</span> {educator.mode.join(' / ')}
                </p>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  <span className="font-medium text-[var(--text)]">Subjects:</span> {educator.subjects.join(', ')}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <a
                    href={educator.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition-colors duration-200 hover:opacity-90"
                  >
                    <Video className="h-3.5 w-3.5" />
                    Join Demo Class
                  </a>
                  <a
                    href={educator.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition-colors duration-200 hover:opacity-90"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Chat on WhatsApp
                  </a>
                </div>

                <div className="mt-3 grid grid-cols-[1fr_auto] gap-2.5">
                  <select
                    value={selectedSlots[educator.name] ?? ''}
                    onChange={(event) => handleSlotChange(educator.name, event.target.value)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] outline-none"
                  >
                    {educator.availableSlots.map((slot) => (
                      <option key={slot} value={slot} className="bg-[var(--card)] text-[var(--text)]">
                        {slot}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleBookSlot(educator.name)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition-colors duration-200 hover:opacity-90"
                  >
                    Book Slot
                  </button>
                </div>

                <div className="mt-3">
                  <a
                    href={educator.directions}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition-colors duration-200 hover:opacity-90"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Get Directions
                  </a>
                </div>
              </article>
            )
          })}
        </section>
      </main>
    </div>
  )
}
