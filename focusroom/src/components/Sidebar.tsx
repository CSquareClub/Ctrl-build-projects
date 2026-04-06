import { Bot, CalendarCheck2, DoorOpen, Gamepad2, Gauge, GraduationCap, LogOut, Trophy } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { logout } from '../services/auth'

const navItems = [
  { label: 'Dashboard', subtitle: 'Overview', icon: Gauge, to: '/dashboard' },
  { label: 'Study Planner', subtitle: 'Plan sessions', icon: CalendarCheck2, to: '/study-planner' },
  { label: 'Smart Room', subtitle: 'Join sessions', icon: DoorOpen, to: '/smart-room' },
  { label: 'Nearby Educators', subtitle: 'Find mentors', icon: GraduationCap, to: '/nearby-educators' },
  { label: 'Analytics & Leaderboard', subtitle: 'Progress + ranks', icon: Trophy, to: '/analytics-leaderboard' },
  { label: 'Ai Assistant', subtitle: 'Study copilot', icon: Bot, to: '/ai-assistant' },
  { label: 'Arcade Mode', subtitle: 'Focus challenges', icon: Gamepad2, to: '/arcade-mode' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const displayName = user?.displayName?.trim()
    || user?.email?.split('@')[0]
    || 'Focus Member'
  const userBadge = user?.emailVerified ? 'Verified User' : 'Unverified User'
  const accountHint = user?.email ?? 'No email available'

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-[var(--border)] bg-[var(--card)] px-4 pb-4 pt-5">
      <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-3">
        <h2 className="font-display text-xl font-semibold text-[var(--accent)]">{displayName}</h2>
        <p className="text-xs text-[var(--muted)]">{userBadge}</p>
        <p className="mt-2 truncate text-xs text-[var(--muted)]">{accountHint}</p>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.label}
              to={item.to}
              end
              className={({ isActive }) =>
                [
                  'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all duration-200',
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm'
                    : 'text-[var(--muted)] hover:bg-[var(--bg-elev)] hover:text-[var(--text)]',
                ].join(' ')
              }
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-elev)]">
                <Icon className="h-4 w-4" />
              </span>
              <span className="leading-tight">
                <span className="block font-medium">{item.label}</span>
                <span className="text-xs opacity-80">{item.subtitle}</span>
              </span>
            </NavLink>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 inline-flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-3 text-sm text-[var(--text)] transition-all duration-200 hover:opacity-90"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </aside>
  )
}
