import { motion } from 'framer-motion'
import { Loader2, Users } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../hooks/useRooms'
import { createRoom } from '../services/rooms'

export function FocusRoomsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { rooms, loading, error } = useRooms()
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState(45)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const handleJoinRoom = (roomId: string) => {
    navigate(`/room/${roomId}`)
  }

  const handleCreateRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateError(null)

    if (!name.trim() || !topic.trim()) {
      setCreateError('Please provide both room name and topic.')
      return
    }

    if (!user) {
      setCreateError('Please login to create a room.')
      return
    }

    setCreateLoading(true)
    try {
      const roomId = await createRoom({
        name,
        topic,
        duration,
      }, user)

      setName('')
      setTopic('')
      setDuration(45)
      navigate(`/room/${roomId}`)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Unable to create room.')
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />

      <main className="p-4 sm:p-6 lg:ml-72">
        <header className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h1 className="font-display text-2xl font-semibold">Smart Focus Rooms</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Join an active room and start a tracked focus session.</p>
        </header>

        <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-lg font-semibold text-[var(--text)]">Create Room</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Start a new live room and invite others to join and chat in real time.</p>

          <form onSubmit={handleCreateRoom} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-[var(--text)]">
              Room Name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Deep Work Sprint"
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-0 placeholder:text-[var(--muted)] focus:border-[var(--text)]"
              />
            </label>

            <label className="text-sm text-[var(--text)]">
              Topic
              <input
                type="text"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Chemistry revision"
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-0 placeholder:text-[var(--muted)] focus:border-[var(--text)]"
              />
            </label>

            <label className="text-sm text-[var(--text)] sm:col-span-2">
              Duration (minutes)
              <input
                type="number"
                min={15}
                max={180}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value) || 45)}
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] outline-none ring-0 placeholder:text-[var(--muted)] focus:border-[var(--text)]"
              />
            </label>

            <div className="sm:col-span-2 flex items-center justify-between gap-3">
              {createError ? <p className="text-sm text-[var(--muted)]">{createError}</p> : <span />}
              <button
                type="submit"
                disabled={createLoading}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-opacity hover:opacity-90 disabled:opacity-70"
              >
                {createLoading ? 'Creating...' : 'Create & Join Room'}
              </button>
            </div>
          </form>
        </section>

        {loading ? (
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading rooms...
          </div>
        ) : null}

        {error ? <p className="text-sm text-[var(--muted)]">{error}</p> : null}

        {!loading && !error && rooms.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm text-[var(--muted)]">
            No rooms found in Firestore. Add documents in the rooms collection to start.
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <motion.article
              key={room.id}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 backdrop-blur-xl transition-all duration-300"
            >
              <h2 className="text-lg font-semibold text-[var(--text)]">{room.name}</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{room.topic}</p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-1 text-xs text-[var(--muted)]">
                <Users className="h-3.5 w-3.5" />
                Live room • {room.duration} min
              </div>

              <button
                type="button"
                onClick={() => handleJoinRoom(room.id)}
                className="mt-5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition-all duration-300 hover:opacity-90"
              >
                Join Room
              </button>
            </motion.article>
          ))}
        </section>
      </main>
    </div>
  )
}
