'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Sword, Clock, Flame, Swords } from 'lucide-react'
import type { User } from '@/lib/types'

const statusDot: Record<User['status'], string> = {
  focused: 'bg-green-400',
  warning: 'bg-yellow-400',
  distracted: 'bg-red-500',
}

interface LeaderboardProps {
  users: User[]
  onDuel: (user: User) => void
}

export default function Leaderboard({ users, onDuel }: LeaderboardProps) {
  const sorted = [...users].sort((a, b) => b.totalMinutes - a.totalMinutes)

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/50 text-xs font-semibold tracking-widest uppercase">
          <Swords className="w-3.5 h-3.5" />
          <span>Focus Arena</span>
        </div>
        <div className="text-white/25 text-xs font-mono">LIVE RANKING</div>
      </div>

      {/* Entries */}
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {sorted.map((user, index) => (
            <motion.div
              key={user.id}
              layout
              layoutId={`lb-user-${user.id}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35, delay: index * 0.05 }}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-all ${
                index === 0
                  ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/20'
                  : 'bg-white/3 border border-white/5 hover:bg-white/6'
              }`}
            >
              {/* Rank */}
              <div className="w-7 shrink-0 flex items-center justify-center">
                {index === 0 ? (
                  <motion.span
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-lg"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.6))' }}
                  >
                    👑
                  </motion.span>
                ) : (
                  <span className="font-mono text-sm text-white/30 font-bold">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Avatar + info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {/* Status dot */}
                  <div className="relative flex items-center justify-center">
                    <div className={`w-2 h-2 rounded-full ${statusDot[user.status]}`} />
                    {user.status === 'focused' && (
                      <motion.div
                        className={`absolute w-2 h-2 rounded-full ${statusDot[user.status]}`}
                        animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${index === 0 ? 'text-amber-300' : 'text-white'}`}>
                    {user.name}
                  </span>
                  {user.streak > 10 && <Flame className="w-3 h-3 text-orange-400" />}
                </div>
                <p className="text-[11px] text-white/35 truncate">{user.task}</p>
              </div>

              {/* Stats */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-white/20" />
                  <span className="font-mono text-xs text-white/50">{user.totalMinutes}m</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-orange-400 text-xs">🔥</span>
                  <span className="font-mono text-xs text-orange-400/80">{user.streak}</span>
                </div>
              </div>

              {/* Duel button */}
              {index !== 0 && (
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => onDuel(user)}
                  id={`duel-btn-${user.id}`}
                  className="ml-1 w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 hover:border-red-500/40 flex items-center justify-center text-red-400 transition-all"
                  title={`Challenge ${user.name}`}
                >
                  <Sword className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer bar */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        <div className="flex gap-4 text-[10px] text-white/20 font-mono">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400/60 inline-block" /> Focused</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400/60 inline-block" /> Warning</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/60 inline-block" /> Distracted</span>
        </div>
      </div>
    </div>
  )
}
