import { Clock3, LogOut, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { useRoomMembers } from '../hooks/useRoomMembers'
import { getRoomById, joinRoom, leaveRoom } from '../services/rooms'
import { saveSession } from '../services/sessions'

const formatElapsed = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function RoomPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { members, loading: membersLoading, error: membersError } = useRoomMembers(id)

  const [roomTitle, setRoomTitle] = useState('Focus Room')
  const [roomTopic, setRoomTopic] = useState('')
  const [loadingRoom, setLoadingRoom] = useState(true)
  const [roomError, setRoomError] = useState<string | null>(null)
  const [joinReady, setJoinReady] = useState(false)
  const [startTime, setStartTime] = useState<Date>(() => new Date())
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const tick = window.setInterval(() => {
      const now = Date.now()
      const diffSeconds = Math.max(0, Math.floor((now - startTime.getTime()) / 1000))
      setElapsedSeconds(diffSeconds)
    }, 1000)

    return () => window.clearInterval(tick)
  }, [startTime])

  useEffect(() => {
    let alive = true

    const run = async () => {
      if (!id) {
        setRoomError('Invalid room id.')
        setLoadingRoom(false)
        return
      }

      if (!user) {
        setRoomError('Please login to join this room.')
        setLoadingRoom(false)
        return
      }

      try {
        const room = await getRoomById(id)
        if (!alive) return

        if (!room) {
          setRoomError('Room not found. Please check the room link.')
          setLoadingRoom(false)
          return
        }

        setRoomTitle(room.name)
        setRoomTopic(room.topic)

        await joinRoom(id, user)
        if (!alive) return

        setStartTime(new Date())
        setJoinReady(true)
      } catch (error) {
        if (!alive) return
        setRoomError(error instanceof Error ? error.message : 'Unable to join room.')
      } finally {
        if (alive) {
          setLoadingRoom(false)
        }
      }
    }

    void run()

    return () => {
      alive = false
    }
  }, [id, user])

  const timerText = useMemo(() => formatElapsed(elapsedSeconds), [elapsedSeconds])

  const handleLeaveRoom = async () => {
    if (!user || !id) {
      navigate('/dashboard', { replace: true })
      return
    }

    setSubmitting(true)
    const endTime = new Date()
    const duration = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)))

    try {
      await leaveRoom(id, user)
      await saveSession({
        userId: user.uid,
        roomId: id,
        roomTitle,
        startTime,
        endTime,
        duration,
      })
    } finally {
      setSubmitting(false)
    }

    navigate('/dashboard', { replace: true })
  }

  if (loadingRoom) {
    return (
      <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
        <Sidebar />
        <main className="ml-72 flex min-h-screen items-center justify-center p-6">
          <p className="text-sm text-[var(--muted)]">Joining room...</p>
        </main>
      </div>
    )
  }

  if (roomError) {
    return (
      <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
        <Sidebar />
        <main className="ml-72 flex min-h-screen items-center justify-center p-6">
          <section className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
            <h1 className="text-2xl font-semibold">Unable to open room</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{roomError}</p>
            <button
              type="button"
              onClick={() => navigate('/smart-room')}
              className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-sm text-[var(--text)]"
            >
              Back to Live Rooms
            </button>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />

      <main className="ml-72 flex min-h-screen items-center justify-center p-6">
        <section className="w-full max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Live Session</p>
          <h1 className="mt-3 font-display text-4xl font-semibold">{roomTitle}</h1>
          {roomTopic ? <p className="mt-2 text-sm text-[var(--muted)]">Topic: {roomTopic}</p> : null}

          <div className="mx-auto mt-6 w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 text-left">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
              <Users className="h-4 w-4" />
              Members ({members.length})
            </p>

            {membersLoading ? <p className="mt-2 text-xs text-[var(--muted)]">Loading members...</p> : null}
            {membersError ? <p className="mt-2 text-xs text-[var(--muted)]">{membersError}</p> : null}

            {!membersLoading && members.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--muted)]">No members in this room yet.</p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm text-[var(--text)]">
                {members.map((member) => (
                  <li key={member.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5">
                    <span>{member.name}</span>
                    <span className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">{member.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mx-auto mt-8 w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-8">
            <p className="mb-3 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
              <Clock3 className="h-4 w-4" />
              Focus Timer
            </p>
            <p className="font-display text-7xl font-bold text-[var(--text)]">{timerText}</p>
          </div>

          <button
            type="button"
            onClick={handleLeaveRoom}
            disabled={submitting || !joinReady}
            className="mt-8 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-5 py-2.5 text-sm font-medium text-[var(--text)] transition-all duration-200 hover:opacity-90 disabled:opacity-70"
          >
            <LogOut className="h-4 w-4" />
            {submitting ? 'Leaving...' : 'Leave Room'}
          </button>
        </section>
      </main>
    </div>
  )
}
