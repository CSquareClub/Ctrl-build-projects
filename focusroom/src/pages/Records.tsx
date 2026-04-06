import { useEffect, useState } from 'react'

import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { getSessionsByUser, type SessionRecord } from '../services/sessions'

const formatDate = (isoMs: number) => {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoMs))
}

export function RecordsPage() {
  const { user } = useAuth()
  const [records, setRecords] = useState<SessionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const result = await getSessionsByUser(user.uid)
        setRecords(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load records.')
      } finally {
        setLoading(false)
      }
    }

    void run()
  }, [user])

  return (
    <div className="min-h-screen w-full bg-[#020b1f] text-slate-100">
      <Sidebar />

      <main className="ml-72 p-6">
        <header className="mb-6 rounded-2xl border border-cyan-300/15 bg-[#081833] p-5">
          <h1 className="font-display text-2xl font-semibold">Session Records</h1>
          <p className="mt-1 text-sm text-slate-300">Your complete focus room history from Firestore.</p>
        </header>

        {loading ? <p className="text-sm text-slate-300">Loading records...</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        {!loading && !error && records.length === 0 ? (
          <div className="rounded-2xl border border-cyan-300/20 bg-[#081833] p-5 text-sm text-slate-300">
            No sessions found yet. Join a room to start tracking your focus time.
          </div>
        ) : null}

        <section className="grid gap-3">
          {records.map((session) => (
            <article
              key={session.id}
              className="rounded-2xl border border-cyan-300/15 bg-[#081833] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-medium text-cyan-200">{session.roomTitle}</h2>
                <p className="text-sm text-slate-400">{formatDate(session.startTime.toMillis())}</p>
              </div>
              <p className="mt-2 text-sm text-slate-300">Duration: {session.duration} min</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
