'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, Coffee, Zap } from 'lucide-react'

interface TimerCardProps {
  seconds: number
  isRunning: boolean
  isBreak: boolean
  streakCount: number
  onToggle: () => void
  onReset: () => void
  onComplete: () => void
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TimerCard({
  seconds,
  isRunning,
  isBreak,
  streakCount,
  onToggle,
  onReset,
  onComplete,
}: TimerCardProps) {
  const total = isBreak ? 5 * 60 : 45 * 60
  const progress = ((total - seconds) / total) * 100
  const circumference = 2 * Math.PI * 110

  return (
    <motion.div
      layout
      className="glass rounded-2xl p-6 flex flex-col items-center gap-6 relative overflow-hidden"
    >
      {/* Background ring glow */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: isBreak
            ? 'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.3), transparent 70%)'
            : 'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.3), transparent 70%)',
        }}
      />

      {/* Mode label */}
      <div className="flex items-center gap-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={isBreak ? 'break' : 'work'}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full ${
              isBreak
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            }`}
          >
            {isBreak ? <Coffee className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
            {isBreak ? 'Rest Mode' : 'Deep Work'}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* SVG ring timer */}
      <div className="relative flex items-center justify-center">
        <svg width="256" height="256" className="rotate-[-90deg]">
          {/* Track */}
          <circle
            cx="128"
            cy="128"
            r="110"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          {/* Progress */}
          <motion.circle
            cx="128"
            cy="128"
            r="110"
            fill="none"
            stroke={isBreak ? '#06b6d4' : '#a855f7'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: circumference - (circumference * progress) / 100 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 8px ${isBreak ? '#06b6d4' : '#a855f7'})`,
            }}
          />
        </svg>

        {/* Time */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <motion.span
            key={seconds}
            className="font-mono text-5xl font-bold tabular-nums tracking-tight text-white"
            animate={{ scale: [1.02, 1] }}
            transition={{ duration: 0.15 }}
          >
            {formatTime(seconds)}
          </motion.span>
          <span className="text-white/30 text-xs font-mono">
            {isBreak ? '5 min break' : '45 min focus'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onReset}
          className="w-10 h-10 rounded-full glass glass-hover flex items-center justify-center text-white/50 hover:text-white transition-colors"
          id="timer-reset-btn"
        >
          <RotateCcw className="w-4 h-4" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={onToggle}
          id="timer-toggle-btn"
          className={`w-16 h-16 rounded-full flex items-center justify-center font-semibold text-white transition-all shadow-lg ${
            isBreak
              ? 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/30'
              : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30'
          }`}
          style={{
            boxShadow: isRunning
              ? `0 0 30px ${isBreak ? 'rgba(6,182,212,0.4)' : 'rgba(139,92,246,0.4)'}`
              : 'none',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isRunning ? 'pause' : 'play'}
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </motion.div>
          </AnimatePresence>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onComplete}
          id="session-complete-btn"
          className="w-10 h-10 rounded-full glass glass-hover flex items-center justify-center text-white/50 hover:text-white/80 transition-colors text-lg"
        >
          ✓
        </motion.button>
      </div>

      {/* Progress text */}
      <p className="text-white/25 text-[11px] font-mono tracking-wider">
        {progress.toFixed(0)}% COMPLETE · SESSION #{streakCount + 1}
      </p>
    </motion.div>
  )
}
