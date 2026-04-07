import {
  Bell,
  CalendarDays,
  Camera,
  FileText,
  MessageCircle,
  Mic,
  Moon,
  Phone,
  Search,
  Sun,
  Video,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { Sidebar } from '../components/Sidebar'
import { useRooms } from '../hooks/useRooms'
import { getStoredTheme, setTheme, subscribeTheme, toggleTheme, type ThemeMode } from '../lib/theme'

const quickActions = [
  {
    sidebarLabel: 'Smart Room',
    label: 'Start Focus Session',
    description: 'Jump into a live focus room',
    icon: Camera,
    to: '/smart-room',
  },
  {
    sidebarLabel: 'Smart Room',
    label: 'Explore Rooms',
    description: 'Find rooms by intensity and topic',
    icon: Search,
    to: '/smart-room',
  },
  {
    sidebarLabel: 'Study Planner',
    label: 'Plan Sprint',
    description: 'Set your next deep-work block',
    icon: CalendarDays,
    to: '/study-planner',
  },
  {
    sidebarLabel: 'Ai Assistant',
    label: 'AI Coach',
    description: 'Get personalized focus guidance',
    icon: MessageCircle,
    to: '/ai-assistant',
  },
  {
    sidebarLabel: 'Analytics an Leaderboard',
    label: 'Session Records',
    description: 'View your duration and consistency logs',
    icon: FileText,
    to: '/analytics-leaderboard',
  },
  {
    sidebarLabel: 'Ai Assistant',
    label: 'Focus Chat',
    description: 'Stay accountable with your room',
    icon: Mic,
    to: '/ai-assistant',
  },
  {
    sidebarLabel: 'Nearby Educators',
    label: 'Mentor Call',
    description: 'Call support for study planning',
    icon: Phone,
    to: '/nearby-educators',
  },
  {
    sidebarLabel: 'Arcade Mode',
    label: 'Group Session',
    description: 'Multi-user accountability room',
    icon: Video,
    to: '/arcade-mode',
  },
]

export function DashboardPage() {
  const { user } = useAuth()
  const { rooms, loading: roomsLoading, error: roomsError } = useRooms()
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme())

  useEffect(() => {
    setThemeState(getStoredTheme())

    const unsubscribe = subscribeTheme((nextTheme) => {
      setThemeState(nextTheme)
    })

    return unsubscribe
  }, [])

  const handleThemeToggle = () => {
    const nextTheme = toggleTheme(theme)
    setTheme(nextTheme)
    setThemeState(nextTheme)
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />

      <main className="p-4 sm:p-6 lg:ml-72">
        <header className="mb-5 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 shadow-sm">
          <div>
            <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-[var(--muted)]">Welcome back, Satyam • {user?.email ?? 'satyam@focusroom.app'}</p>
          </div>
          <button
            type="button"
            onClick={handleThemeToggle}
            aria-label="Toggle theme"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] text-[var(--muted)]"
          >
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </header>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-4">
            <h2 className="text-lg font-semibold">Recent Focus Activity</h2>
            <ul className="mt-3 space-y-3 text-sm text-[var(--muted)]">
              <li className="flex items-center gap-3">
                <span className="icon-soft inline-flex h-8 w-8 items-center justify-center rounded-lg">
                  <Camera className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-medium text-[var(--text)]">Completed Neural Recall deck</p>
                  <p className="text-xs text-[var(--muted)]">2 days ago • 24 flashcards mastered</p>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="icon-soft inline-flex h-8 w-8 items-center justify-center rounded-lg">
                  <Bell className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-medium text-[var(--text)]">Smart room checkpoint alert</p>
                  <p className="text-xs text-[var(--muted)]">3 days ago • Maintained 42-minute focus run</p>
                </div>
              </li>
            </ul>
          </div>

          <h2 className="mb-3 mt-5 text-2xl font-semibold">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon

              return (
                <Link
                  key={action.label}
                  to={action.to}
                  className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-[var(--text)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--bg-elev)]"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] text-[var(--muted)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                      {action.sidebarLabel}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold leading-tight">{action.label}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">{action.description}</p>
                </Link>
              )
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Live Rooms</h2>
              <Link to="/smart-room" className="text-xs text-[var(--muted)] hover:text-[var(--text)]">View all</Link>
            </div>

            {roomsLoading ? <p className="mt-3 text-sm text-[var(--muted)]">Loading live rooms...</p> : null}
            {roomsError ? <p className="mt-3 text-sm text-[var(--muted)]">{roomsError}</p> : null}

            {!roomsLoading && !roomsError && rooms.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">No live rooms right now.</p>
            ) : null}

            {!roomsLoading && rooms.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {rooms.slice(0, 4).map((room) => (
                  <li key={room.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-[var(--text)]">{room.name}</p>
                        <p className="text-xs text-[var(--muted)]">{room.topic} • {room.duration} min</p>
                      </div>
                      <Link
                        to={`/room/${room.id}`}
                        className="rounded-lg border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-1 text-xs text-[var(--text)] hover:opacity-90"
                      >
                        Join
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  )
}
