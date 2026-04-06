import { useEffect, useMemo, useState } from 'react'

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

const formatDetailedDuration = (startMs: number, endMs: number) => {
  const totalSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000))
  const hrs = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  const totalMinutes = (totalSeconds / 60).toFixed(1)

  const parts: string[] = []
  if (hrs > 0) parts.push(`${hrs} hr`)
  if (mins > 0 || hrs > 0) parts.push(`${mins} min`)
  parts.push(`${secs} sec`)

  return {
    primary: parts.join(' '),
    totalMinutes,
    totalSeconds,
  }
}

const formatMinutesCompact = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins === 0 ? `${hrs} hr` : `${hrs} hr ${mins} min`
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

  const report = useMemo(() => {
    if (records.length === 0) {
      return {
        totalSessions: 0,
        totalMinutes: 0,
        avgMinutes: 0,
        longestMinutes: 0,
        thisWeekMinutes: 0,
      }
    }

    const totalMinutes = records.reduce((sum, session) => sum + session.duration, 0)
    const longestMinutes = records.reduce((max, session) => Math.max(max, session.duration), 0)
    const avgMinutes = Math.round(totalMinutes / records.length)

    const weekStart = new Date()
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - 6)

    const thisWeekMinutes = records
      .filter((session) => session.startTime.toDate() >= weekStart)
      .reduce((sum, session) => sum + session.duration, 0)

    return {
      totalSessions: records.length,
      totalMinutes,
      avgMinutes,
      longestMinutes,
      thisWeekMinutes,
    }
  }, [records])

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />

      <main className="ml-72 p-6">
        <header className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h1 className="font-display text-2xl font-semibold">Session Records</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Your complete focus room history with exact start/end time and session details.</p>
        </header>

        {loading ? <p className="text-sm text-[var(--muted)]">Loading records...</p> : null}
        {error ? <p className="text-sm text-[var(--muted)]">{error}</p> : null}

        {!loading && !error && records.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm text-[var(--muted)]">
            No sessions found yet. Join a room to start tracking your focus time.
          </div>
        ) : null}

        {!loading && !error && records.length > 0 ? (
          <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">Total Sessions</p>
              <p className="mt-2 text-2xl font-semibold">{report.totalSessions}</p>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">Total Focus Time</p>
              <p className="mt-2 text-2xl font-semibold">{formatMinutesCompact(report.totalMinutes)}</p>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">Average Session</p>
              <p className="mt-2 text-2xl font-semibold">{formatMinutesCompact(report.avgMinutes)}</p>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">Longest Session</p>
              <p className="mt-2 text-2xl font-semibold">{formatMinutesCompact(report.longestMinutes)}</p>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">Last 7 Days</p>
              <p className="mt-2 text-2xl font-semibold">{formatMinutesCompact(report.thisWeekMinutes)}</p>
            </article>
          </section>
        ) : null}

        <section className="grid gap-3">
          {records.map((session) => (
            (() => {
              const startMs = session.startTime.toMillis()
              const endMs = session.endTime.toMillis()
              const duration = formatDetailedDuration(startMs, endMs)

              return (
            <article
              key={session.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[var(--text)]">
                    {session.roomTitle?.trim() || `Room ${session.roomId.slice(0, 8)}`}
                  </h2>
                  {session.roomTopic ? (
                    <p className="mt-1 text-xs uppercase tracking-[0.08em] text-[var(--muted)]">{session.roomTopic}</p>
                  ) : null}
                </div>

                <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-1 text-[11px] text-[var(--muted)]">
                  Session #{session.id.slice(0, 8)}
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <p className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)]">
                  <span className="text-[var(--muted)]">Started:</span> {formatDate(startMs)}
                </p>
                <p className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)]">
                  <span className="text-[var(--muted)]">Ended:</span> {formatDate(endMs)}
                </p>
                <p className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)]">
                  <span className="text-[var(--muted)]">Duration:</span> {duration.primary}
                </p>
                <p className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)]">
                  <span className="text-[var(--muted)]">Members at end:</span> {session.memberCount}
                </p>
              </div>

              <p className="mt-3 text-xs text-[var(--muted)]">
                Attended total: {duration.totalMinutes} minutes ({duration.totalSeconds} seconds)
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-1 text-[var(--muted)]">Room ID: {session.roomId.slice(0, 10)}</span>
                {session.roomTopic ? (
                  <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-1 text-[var(--muted)]">Topic: {session.roomTopic}</span>
                ) : null}
              </div>
            </article>
              )
            })()
          ))}
        </section>
      </main>
    </div>
  )
}
