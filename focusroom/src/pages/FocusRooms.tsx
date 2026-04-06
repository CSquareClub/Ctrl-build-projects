import { motion } from 'framer-motion'
import { Loader2, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Sidebar } from '../components/Sidebar'
import { useRooms } from '../hooks/useRooms'

export function FocusRoomsPage() {
  const navigate = useNavigate()
  const { rooms, loading, error } = useRooms()

  const handleJoinRoom = (roomId: string) => {
    navigate(`/room/${roomId}`)
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />

      <main className="ml-72 p-6">
        <header className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h1 className="font-display text-2xl font-semibold">Smart Focus Rooms</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Join an active room and start a tracked focus session.</p>
        </header>

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
