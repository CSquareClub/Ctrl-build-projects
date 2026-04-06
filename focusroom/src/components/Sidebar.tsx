import { Bot, CalendarCheck2, DoorOpen, Gamepad2, Gauge, GraduationCap, LogOut, Trophy } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'

import { logout } from '../services/auth'

const navItems = [
  { label: 'Dashboard', subtitle: 'Overview', icon: Gauge, to: '/dashboard' },
  { label: 'Study Planner', subtitle: 'Plan sessions', icon: CalendarCheck2, to: '/study-planner' },
  { label: 'Smart Room', subtitle: 'Join sessions', icon: DoorOpen, to: '/smart-room' },
  { label: 'Nearby Educators', subtitle: 'Find mentors', icon: GraduationCap, to: '/nearby-educators' },
  { label: 'Analytics an Leaderboard', subtitle: 'Progress + ranks', icon: Trophy, to: '/analytics-leaderboard' },
  { label: 'Ai Assistant', subtitle: 'Study copilot', icon: Bot, to: '/ai-assistant' },
  { label: 'Arcade Mode', subtitle: 'Focus challenges', icon: Gamepad2, to: '/arcade-mode' },
]

export function Sidebar() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-cyan-300/15 bg-[#08142d] px-4 pb-4 pt-5">
      <div className="mb-6 rounded-2xl border border-cyan-300/15 bg-[#0c1c3b] p-3">
        <h2 className="font-display text-xl font-semibold text-cyan-300">Satyam</h2>
        <p className="text-xs text-slate-300">Premium • Verified</p>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
            <span>Health Score</span>
            <span className="font-semibold text-emerald-300">91%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-700/60">
            <div className="h-full w-[91%] rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" />
          </div>
        </div>
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
                    ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.25)]'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white',
                ].join(' ')
              }
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
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
        className="mt-4 inline-flex w-full items-center gap-3 rounded-2xl border border-red-300/25 bg-red-500/10 px-3 py-3 text-sm text-red-100 transition-all duration-200 hover:bg-red-500/20"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </aside>
  )
}
