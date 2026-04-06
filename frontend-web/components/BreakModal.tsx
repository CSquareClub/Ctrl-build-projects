'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Sunset, Wind, Waves } from 'lucide-react'

interface BreakModalProps {
  isOpen: boolean
  onClose: () => void
  onEndBreak: () => void
}

const tips = [
  'Stand up and stretch your neck & shoulders',
  'Look away from the screen — focus on something 20 feet away',
  'Take 5 deep, slow breaths',
  'Get some water and hydrate',
  'Rest your eyes and blink slowly',
]

export default function BreakModal({ isOpen, onClose, onEndBreak }: BreakModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div
              className="pointer-events-auto max-w-md w-full mx-4 rounded-3xl p-8 relative overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(20,184,166,0.08), rgba(255,255,255,0.04))',
                border: '1px solid rgba(6,182,212,0.25)',
                backdropFilter: 'blur(40px)',
                boxShadow: '0 0 80px rgba(6,182,212,0.15), 0 40px 80px rgba(0,0,0,0.5)',
              }}
            >
              {/* Airy background blobs */}
              <div
                className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-20"
                style={{
                  background: 'radial-gradient(circle, rgba(6,182,212,0.8), transparent 70%)',
                  filter: 'blur(40px)',
                }}
              />
              <div
                className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full opacity-15"
                style={{
                  background: 'radial-gradient(circle, rgba(20,184,166,0.8), transparent 70%)',
                  filter: 'blur(40px)',
                }}
              />

              {/* Close */}
              <button
                onClick={onClose}
                id="break-modal-close"
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Content */}
              <div className="relative flex flex-col items-center text-center gap-6">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-6xl"
                >
                  🌿
                </motion.div>

                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Time to Breathe</h2>
                  <p className="text-white/50 text-sm">
                    You've earned this. Step away, reset, and come back stronger.
                  </p>
                </div>

                {/* Tips */}
                <div className="w-full rounded-2xl p-4 text-left space-y-2.5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {tips.map((tip, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-2.5"
                    >
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-white/65 text-sm">{tip}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Breathe icons */}
                <div className="flex gap-6 text-white/30">
                  {[Sunset, Wind, Waves].map((Icon, i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 0.8, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.7 }}
                    >
                      <Icon className="w-5 h-5" />
                    </motion.div>
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onEndBreak}
                  id="end-break-btn"
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold text-sm tracking-wider hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                >
                  I'm Ready — Back to Work 💪
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
