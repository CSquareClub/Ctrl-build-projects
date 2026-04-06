'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { Camera, Wifi, WifiOff } from 'lucide-react'
import type { FocusStatus } from '@/lib/types'

interface WebcamCardProps {
  focusStatus: FocusStatus
}

const statusConfig = {
  focused: {
    glow: 'rgba(74, 222, 128, 0.5)',
    border: 'rgba(74, 222, 128, 0.4)',
    label: 'In Focus',
    labelColor: 'text-green-400',
    dot: 'bg-green-400',
    ring: 'rgba(74, 222, 128, 0.3)',
  },
  warning: {
    glow: 'rgba(234, 179, 8, 0.5)',
    border: 'rgba(234, 179, 8, 0.4)',
    label: 'Eyes on screen',
    labelColor: 'text-yellow-400',
    dot: 'bg-yellow-400',
    ring: 'rgba(234, 179, 8, 0.3)',
  },
  distracted: {
    glow: 'rgba(239, 68, 68, 0.6)',
    border: 'rgba(239, 68, 68, 0.5)',
    label: 'Distracted!',
    labelColor: 'text-red-400',
    dot: 'bg-red-500',
    ring: 'rgba(239, 68, 68, 0.4)',
  },
}

export default function WebcamCard({ focusStatus }: WebcamCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const cfg = statusConfig[focusStatus]

  useEffect(() => {
    let stream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((s) => {
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
        }
      })
      .catch(() => {
        // webcam not available — demo mode
      })
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div className="relative">
      {/* Glow ring behind card */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        animate={{
          boxShadow:
            focusStatus === 'distracted'
              ? [
                  `0 0 30px ${cfg.glow}, 0 0 80px ${cfg.ring}`,
                  `0 0 60px ${cfg.glow}, 0 0 120px ${cfg.ring}`,
                  `0 0 30px ${cfg.glow}, 0 0 80px ${cfg.ring}`,
                ]
              : [
                  `0 0 20px ${cfg.glow}, 0 0 50px ${cfg.ring}`,
                  `0 0 40px ${cfg.glow}, 0 0 80px ${cfg.ring}`,
                  `0 0 20px ${cfg.glow}, 0 0 50px ${cfg.ring}`,
                ],
        }}
        transition={{
          duration: focusStatus === 'distracted' ? 0.8 : 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Card */}
      <motion.div
        layout
        className="relative rounded-2xl overflow-hidden glass"
        style={{ border: `1px solid ${cfg.border}` }}
        animate={{ scale: focusStatus === 'distracted' ? [1, 1.005, 1] : 1 }}
        transition={{ duration: 0.5, repeat: focusStatus === 'distracted' ? Infinity : 0 }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center">
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <motion.div
                className={`absolute w-2.5 h-2.5 rounded-full ${cfg.dot}`}
                animate={{ scale: [1, 2], opacity: [0.8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
            <span className={`text-xs font-semibold tracking-wider uppercase ${cfg.labelColor}`}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-white/40 text-xs">
            <Camera className="w-3.5 h-3.5" />
            <span>YOLOv8 Active</span>
          </div>
        </div>

        {/* Video feed */}
        <div className="relative aspect-video bg-black/60">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Scanning lines overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              background:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.05) 2px, rgba(0,255,0,0.05) 4px)',
            }}
          />

          {/* Corner brackets — cyberpunk HUD */}
          {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map(
            (pos, i) => (
              <div key={i} className={`absolute ${pos} w-6 h-6`}>
                <div
                  className="w-full h-full"
                  style={{
                    border: `2px solid ${cfg.border}`,
                    borderRight: i % 2 === 0 ? 'none' : undefined,
                    borderLeft: i % 2 === 1 ? 'none' : undefined,
                    borderBottom: i < 2 ? 'none' : undefined,
                    borderTop: i >= 2 ? 'none' : undefined,
                  }}
                />
              </div>
            )
          )}

          {/* Distracted overlay */}
          <AnimatePresence>
            {focusStatus === 'distracted' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.08)' }}
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="text-center"
                >
                  <div className="text-4xl mb-2">📵</div>
                  <p className="text-red-400 font-bold text-sm tracking-wider uppercase">
                    Phone Detected
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI info strip */}
        <div className="px-4 py-2.5 flex items-center gap-3 text-xs text-white/30">
          <Wifi className="w-3.5 h-3.5 text-green-500/60" />
          <span>Tracking: Class 0 (Person) · Class 67 (Cell Phone)</span>
        </div>
      </motion.div>
    </div>
  )
}
