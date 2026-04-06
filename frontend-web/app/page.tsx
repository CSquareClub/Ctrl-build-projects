'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Brain, Settings, Bell, LogOut, ChevronRight } from 'lucide-react'

import BackgroundMesh from '@/components/BackgroundMesh'
import WebcamCard from '@/components/WebcamCard'
import TimerCard from '@/components/TimerCard'
import TaskBadges from '@/components/TaskBadges'
import BreakModal from '@/components/BreakModal'
import AudioPlayer from '@/components/AudioPlayer'
import Leaderboard from '@/components/Leaderboard'
import ToastStack from '@/components/ToastStack'

import type { FocusStatus, User, Task, Toast } from '@/lib/types'

// ─── Mock data ────────────────────────────────────────────────
const initialUsers: User[] = [
  {
    id: 1,
    name: 'Pruthviraj',
    task: 'Grinding DSA on LeetCode',
    streak: 12,
    status: 'focused',
    totalMinutes: 120,
  },
  {
    id: 2,
    name: 'Livjot',
    task: 'Writing CV Python Script',
    streak: 8,
    status: 'warning',
    totalMinutes: 85,
  },
  {
    id: 3,
    name: 'Abhishek',
    task: 'Designing Figma UI',
    streak: 15,
    status: 'focused',
    totalMinutes: 150,
  },
]

const FOCUS_DURATION = 45 * 60  // 45 minutes in seconds
const BREAK_DURATION = 5 * 60   // 5 minutes

// ─── Helpers ──────────────────────────────────────────────────
function genId() {
  return Math.random().toString(36).slice(2)
}

export default function FocusRoomPage() {
  // ── State ────────────────────────────────────────────────────
  const [focusStatus, setFocusStatus] = useState<FocusStatus>('focused')
  const [seconds, setSeconds] = useState(FOCUS_DURATION)
  const [isRunning, setIsRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [streakCount, setStreakCount] = useState(0)
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', label: 'LeetCode DSA', color: '#a855f7' },
    { id: '2', label: 'System Design', color: '#06b6d4' },
  ])
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [activeDuel, setActiveDuel] = useState<{ target: User } | null>(null)
  const streakSafe = useRef(true) // tracks if session stayed focused

  // ── Toast helpers ─────────────────────────────────────────────
  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = genId()
    setToasts((prev) => [{ ...toast, id }, ...prev].slice(0, 5))
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // ── Timer tick ────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval)
          handleTimerEnd()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, isBreak])

  function handleTimerEnd() {
    setIsRunning(false)
    if (!isBreak) {
      // Work session ended — start break
      completeSession()
    } else {
      // Break ended — back to work
      setIsBreak(false)
      setShowBreakModal(false)
      setSeconds(FOCUS_DURATION)
      pushToast({ type: 'info', title: 'Break over!', message: 'Time to get back in the zone 💪' })
    }
  }

  function completeSession() {
    const stayedFocused = streakSafe.current
    if (stayedFocused) {
      setStreakCount((s) => s + 1)
      pushToast({
        type: 'streak',
        title: `🔥 Streak x${streakCount + 1}!`,
        message: "You stayed locked in the whole session. Incredible focus.",
      })
    }
    // Increment user totalMinutes
    setUsers((prev) =>
      prev.map((u) => (u.id === 1 ? { ...u, totalMinutes: u.totalMinutes + 45 } : u))
    )
    setIsBreak(true)
    setSeconds(BREAK_DURATION)
    setShowBreakModal(true)
    streakSafe.current = true
  }

  function handleEndBreak() {
    setIsBreak(false)
    setShowBreakModal(false)
    setSeconds(FOCUS_DURATION)
    setIsRunning(true)
  }

  // ── No auto-simulation. Use manual buttons below to test states ──
  function handleManualStatusChange(next: FocusStatus) {
    setFocusStatus(next)
    if (next === 'distracted') {
      streakSafe.current = false
      pushToast({
        type: 'distraction',
        title: '⚠️ Phone Detected!',
        message: 'Eyes back on the screen. Put the phone away!',
      })
      setUsers((prev) => prev.map((u) => u.id === 1 ? { ...u, status: 'distracted' } : u))
    } else if (next === 'focused') {
      setUsers((prev) => prev.map((u) => u.id === 1 ? { ...u, status: 'focused' } : u))
    } else if (next === 'warning') {
      setUsers((prev) => prev.map((u) => u.id === 1 ? { ...u, status: 'warning' } : u))
    }
  }

  // ── Duel handler ──────────────────────────────────────────────
  function handleDuel(user: User) {
    setActiveDuel({ target: user })
    pushToast({
      type: 'duel',
      title: `⚔️ Duel Initiated!`,
      message: `You've challenged ${user.name}! May the most focused dev win.`,
    })
  }

  // ── Background transition (deep work vs break) ────────────────
  const bgStyle = isBreak
    ? {
        background:
          'radial-gradient(ellipse at 30% 30%, rgba(6,182,212,0.15), transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(20,184,166,0.1), transparent 60%)',
      }
    : {}

  return (
    <>
      <BackgroundMesh />

      {/* Break background overlay */}
      <AnimatePresence>
        {isBreak && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={bgStyle}
          />
        )}
      </AnimatePresence>

      {/* Toasts */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Break modal */}
      <BreakModal
        isOpen={showBreakModal}
        onClose={() => setShowBreakModal(false)}
        onEndBreak={handleEndBreak}
      />

      {/* Audio player widget */}
      <AudioPlayer />

      {/* ── Main layout ─────────────────────────────────────────────── */}
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 px-6 py-4">
          <div
            className="max-w-7xl mx-auto flex items-center justify-between rounded-2xl px-5 py-3"
            style={{
              background: 'rgba(2,6,23,0.75)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.2))',
                  border: '1px solid rgba(139,92,246,0.3)',
                }}
              >
                🧠
              </motion.div>
              <div>
                <h1 className="text-white font-bold text-sm leading-none">Focus Room</h1>
                <p className="text-white/30 text-[10px] mt-0.5 tracking-wider">FLOW STATE ENGINE</p>
              </div>
            </div>

            {/* Centre: Active duel badge */}
            <AnimatePresence>
              {activeDuel && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    background: 'rgba(168,85,247,0.15)',
                    border: '1px solid rgba(168,85,247,0.3)',
                    color: '#c084fc',
                  }}
                >
                  <span>⚔️</span>
                  <span>Dueling {activeDuel.target.name}</span>
                  <button
                    onClick={() => setActiveDuel(null)}
                    className="text-purple-400/50 hover:text-purple-400 ml-1"
                  >
                    ×
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Right: Streak + controls */}
            <div className="flex items-center gap-3">
              {/* Streak fire counter */}
              <motion.div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(251,146,60,0.12)',
                  border: '1px solid rgba(251,146,60,0.25)',
                }}
                whileHover={{ scale: 1.05 }}
              >
                <motion.span
                  key={streakCount}
                  animate={streakCount > 0 ? { scale: [1, 1.6, 1], rotate: [0, 15, -15, 0] } : {}}
                  transition={{ duration: 0.5 }}
                  className="text-base"
                >
                  🔥
                </motion.span>
                <span className="font-mono text-sm font-bold text-orange-400">
                  {streakCount}
                </span>
              </motion.div>

              <button id="notif-btn" className="w-8 h-8 rounded-xl glass glass-hover flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
                <Bell className="w-4 h-4" />
              </button>
              <button id="settings-btn" className="w-8 h-8 rounded-xl glass glass-hover flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 grid grid-cols-12 gap-5 items-start">

          {/* ── Left sidebar ─────────────────────────────────── */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col gap-4">
            {/* User profile card */}
            <motion.div
              layout
              className="glass rounded-2xl p-4 flex items-center gap-3"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #0891b2)',
                }}
              >
                P
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">Pruthviraj</p>
                <p className="text-white/40 text-xs truncate">
                  {focusStatus === 'focused' ? '🟢 In the zone' : focusStatus === 'warning' ? '🟡 Eyes drifting' : '🔴 Distracted'}
                </p>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${focusStatus === 'focused' ? 'bg-green-400' : focusStatus === 'warning' ? 'bg-yellow-400' : 'bg-red-500'}`} />
            </motion.div>

            {/* Task badges */}
            <TaskBadges
              tasks={tasks}
              onAdd={(t) => setTasks((prev) => [...prev, t])}
              onRemove={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
            />

            {/* Quick stats */}
            <div className="glass rounded-2xl p-4 grid grid-cols-2 gap-3">
              {[
                { label: 'Sessions', value: streakCount, icon: '🎯' },
                { label: 'Focus Min', value: streakCount * 45, icon: '⏱' },
                { label: 'Best Streak', value: Math.max(streakCount, 12), icon: '🔥' },
                { label: 'Arena Rank', value: '#3', icon: '🏆' },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  whileHover={{ scale: 1.04 }}
                  className="rounded-xl bg-white/3 border border-white/5 p-3 text-center"
                >
                  <div className="text-xl mb-1">{stat.icon}</div>
                  <div className="font-mono text-white font-bold text-lg leading-none">{stat.value}</div>
                  <div className="text-white/30 text-[10px] mt-0.5">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </aside>

          {/* ── Centre column ─────────────────────────────────── */}
          <section className="col-span-12 lg:col-span-6 flex flex-col gap-5">
            {/* Webcam card */}
            <WebcamCard focusStatus={focusStatus} />

            {/* Focus status simulator buttons */}
            <div className="flex gap-2 justify-center">
              {(['focused', 'warning', 'distracted'] as FocusStatus[]).map((s) => (
                <motion.button
                  key={s}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleManualStatusChange(s)}
                  id={`status-${s}`}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    focusStatus === s
                      ? s === 'focused'
                        ? 'bg-green-500/20 border-green-500/40 text-green-400'
                        : s === 'warning'
                        ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                        : 'bg-red-500/20 border-red-500/40 text-red-400'
                      : 'bg-white/3 border-white/10 text-white/30 hover:text-white/60'
                  }`}
                >
                  {s}
                </motion.button>
              ))}
              <span className="text-white/20 text-xs self-center ml-2">← simulate AI</span>
            </div>

            {/* Timer */}
            <TimerCard
              seconds={seconds}
              isRunning={isRunning}
              isBreak={isBreak}
              streakCount={streakCount}
              onToggle={() => setIsRunning((r) => !r)}
              onReset={() => { setIsRunning(false); setSeconds(isBreak ? BREAK_DURATION : FOCUS_DURATION) }}
              onComplete={completeSession}
            />
          </section>

          {/* ── Right sidebar ─────────────────────────────────── */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col gap-4">
            <Leaderboard users={users} onDuel={handleDuel} />

            {/* Quick actions */}
            <div className="glass rounded-2xl p-4 flex flex-col gap-2">
              <div className="text-white/30 text-[10px] font-semibold tracking-widest uppercase mb-1">
                Quick Actions
              </div>
              {[
                { label: 'Start Break Now', emoji: '☕', action: () => { setIsBreak(true); setShowBreakModal(true); setSeconds(BREAK_DURATION) } },
                { label: 'End Session', emoji: '✅', action: completeSession },
                { label: 'Boost My Rank', emoji: '⚡', action: () => setUsers((p) => p.map((u) => u.id === 1 ? { ...u, totalMinutes: u.totalMinutes + 30 } : u)) },
              ].map((action) => (
                <motion.button
                  key={action.label}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={action.action}
                  className="flex items-center gap-3 rounded-xl bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/10 px-3 py-2.5 text-left transition-all group"
                >
                  <span className="text-lg">{action.emoji}</span>
                  <span className="text-white/60 group-hover:text-white/80 text-sm transition-colors flex-1">{action.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-colors" />
                </motion.button>
              ))}
            </div>
          </aside>
        </main>
      </div>
    </>
  )
}
