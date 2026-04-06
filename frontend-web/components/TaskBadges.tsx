'use client'

import { useState, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Tag } from 'lucide-react'
import type { Task } from '@/lib/types'

const BADGE_COLORS = [
  { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)', text: '#a855f7' },
  { bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.4)', text: '#06b6d4' },
  { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.4)', text: '#ec4899' },
  { bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.4)', text: '#4ade80' },
  { bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.4)', text: '#fb923c' },
  { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', text: '#3b82f6' },
]

interface TaskBadgesProps {
  tasks: Task[]
  onAdd: (task: Task) => void
  onRemove: (id: string) => void
}

export default function TaskBadges({ tasks, onAdd, onRemove }: TaskBadgesProps) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)

  function handleAdd() {
    const trimmed = input.trim()
    if (!trimmed) return
    const colorIndex = tasks.length % BADGE_COLORS.length
    const color = BADGE_COLORS[colorIndex]
    onAdd({
      id: crypto.randomUUID(),
      label: trimmed,
      color: color.text,
    })
    setInput('')
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-white/50 text-xs font-semibold tracking-widest uppercase mb-1">
        <Tag className="w-3.5 h-3.5" />
        <span>Active Tasks</span>
      </div>

      {/* Input */}
      <motion.div
        animate={{ scale: focused ? 1.01 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={`flex items-center gap-2 rounded-xl px-3 py-2 border transition-all duration-200 ${
          focused
            ? 'bg-white/8 border-purple-500/40'
            : 'bg-white/3 border-white/8'
        }`}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Add a task tag…"
          id="task-input"
          className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
        />
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          onClick={handleAdd}
          id="task-add-btn"
          className="w-6 h-6 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 flex items-center justify-center text-purple-400 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </motion.button>
      </motion.div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        <AnimatePresence>
          {tasks.map((task, i) => {
            const colorIndex = i % BADGE_COLORS.length
            const c = BADGE_COLORS[colorIndex]
            return (
              <motion.span
                key={task.id}
                layout
                initial={{ opacity: 0, scale: 0.6, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.6, y: -10 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-default group"
                style={{
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  color: c.text,
                  boxShadow: `0 0 12px ${c.bg}`,
                }}
              >
                {task.label}
                <button
                  onClick={() => onRemove(task.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.span>
            )
          })}
        </AnimatePresence>
        {tasks.length === 0 && (
          <span className="text-white/20 text-xs italic">No tasks yet…</span>
        )}
      </div>
    </div>
  )
}
