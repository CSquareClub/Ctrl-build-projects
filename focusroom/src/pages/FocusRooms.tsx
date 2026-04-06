import { motion } from 'framer-motion'
import { Loader2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Sidebar } from '../components/Sidebar'
import { type Room, getRooms } from '../services/rooms'

type RoomStartState = {
  roomId: string
  roomTitle: string
  startTime: string
}

export function FocusRoomsPage() {
  const navigate = useNavigate()

  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const run = async () => {
      try {
        const result = await getRooms()
        if (isMounted) {
          setRooms(result)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load rooms.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void run()

    return () => {
      isMounted = false
    }
  }, [])

  const handleJoinRoom = (room: Room) => {
    const state: RoomStartState = {
      roomId: room.id,
      roomTitle: room.title,
      startTime: new Date().toISOString(),
    }

    navigate(`/room/${room.id}`, { state })
  }

  return (
    <div className="min-h-screen w-full bg-[#020b1f] text-slate-100">
      <Sidebar />

      <main className="ml-72 p-6">
        <header className="mb-6 rounded-2xl border border-cyan-300/15 bg-[#081833] p-5">
          <h1 className="font-display text-2xl font-semibold">Smart Focus Rooms</h1>
          <p className="mt-1 text-sm text-slate-300">Join an active room and start a tracked focus session.</p>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading rooms...
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        {!loading && !error && rooms.length === 0 ? (
          <div className="rounded-2xl border border-cyan-300/20 bg-[#081833] p-5 text-sm text-slate-300">
            No rooms found in Firestore. Add documents in the rooms collection to start.
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <motion.article
              key={room.id}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group rounded-2xl border border-cyan-300/15 bg-[color-mix(in_srgb,#081833_85%,transparent)] p-5 backdrop-blur-xl transition-all duration-300 hover:bg-gradient-to-br hover:from-cyan-500 hover:to-violet-500"
            >
              <h2 className="text-lg font-semibold transition-colors duration-300 group-hover:text-white">{room.title}</h2>
              <p className="mt-2 text-sm text-slate-300 transition-colors duration-300 group-hover:text-white/90">{room.description}</p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-cyan-400/15 px-3 py-1 text-xs text-cyan-200 transition-colors duration-300 group-hover:bg-white/20 group-hover:text-white">
                <Users className="h-3.5 w-3.5" />
                {room.activeUsers} active users
              </div>

              <button
                type="button"
                onClick={() => handleJoinRoom(room)}
                className="mt-5 w-full rounded-xl border border-cyan-300/25 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition-all duration-300 group-hover:border-white/40 group-hover:bg-white/20"
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
