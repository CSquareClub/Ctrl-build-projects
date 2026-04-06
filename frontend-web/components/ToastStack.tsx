'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Swords, Trophy, Flame, Info } from 'lucide-react'
import type { Toast } from '@/lib/types'

const ICONS = {
  distraction: AlertTriangle,
  duel: Swords,
  session: Trophy,
  streak: Flame,
  info: Info,
}

const COLORS = {
  distraction: {
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.3)',
    icon: 'text-red-400',
    glow: 'rgba(239,68,68,0.15)',
  },
  duel: {
    bg: 'rgba(168,85,247,0.12)',
    border: 'rgba(168,85,247,0.3)',
    icon: 'text-purple-400',
    glow: 'rgba(168,85,247,0.15)',
  },
  session: {
    bg: 'rgba(74,222,128,0.12)',
    border: 'rgba(74,222,128,0.3)',
    icon: 'text-green-400',
    glow: 'rgba(74,222,128,0.15)',
  },
  streak: {
    bg: 'rgba(251,146,60,0.12)',
    border: 'rgba(251,146,60,0.3)',
    icon: 'text-orange-400',
    glow: 'rgba(251,146,60,0.15)',
  },
  info: {
    bg: 'rgba(6,182,212,0.12)',
    border: 'rgba(6,182,212,0.3)',
    icon: 'text-cyan-400',
    glow: 'rgba(6,182,212,0.15)',
  },
}

interface ToastStackProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const Icon = ICONS[toast.type]
  const c = COLORS[toast.type]

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="w-80 rounded-2xl p-4 flex items-start gap-3 cursor-pointer"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        backdropFilter: 'blur(24px)',
        boxShadow: `0 0 30px ${c.glow}, 0 8px 32px rgba(0,0,0,0.4)`,
      }}
      onClick={() => onDismiss(toast.id)}
    >
      {/* Icon */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}
        style={{ background: `${c.border.replace('0.3', '0.15')}` }}
      >
        <motion.div
          animate={
            toast.type === 'distraction'
              ? { rotate: [0, -5, 5, -5, 5, 0] }
              : toast.type === 'duel'
              ? { scale: [1, 1.2, 1] }
              : {}
          }
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Icon className="w-4 h-4" />
        </motion.div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">{toast.title}</p>
        <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{toast.message}</p>
      </div>

      {/* Dismiss */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id) }}
        className="text-white/20 hover:text-white/60 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Auto-dismiss progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 rounded-full"
        style={{ background: c.border }}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 5, ease: 'linear' }}
      />
    </motion.div>
  )
}

export default function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto relative">
            <ToastItem toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
