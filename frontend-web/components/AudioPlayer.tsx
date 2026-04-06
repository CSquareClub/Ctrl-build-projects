'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Volume2, ChevronUp, Disc } from 'lucide-react'
import type { AudioTrack } from '@/lib/types'

const TRACKS: AudioTrack[] = [
  { id: 'lofi', label: 'Lofi Beats', emoji: '☕', src: '' },
  { id: 'rain', label: 'Rain & Thunder', emoji: '🌧️', src: '' },
  { id: 'space', label: 'Deep Space', emoji: '🌌', src: '' },
]

// Animated EQ bars
function EQWave({ playing }: { playing: boolean }) {
  const bars = [0.4, 0.8, 0.6, 1, 0.5, 0.9, 0.7, 0.45]
  return (
    <div className="flex items-end gap-[2px] h-5">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-purple-400"
          animate={
            playing
              ? {
                  scaleY: [height, height * 0.3, height, height * 0.7, height],
                }
              : { scaleY: 0.15 }
          }
          transition={{
            duration: 0.8,
            repeat: playing ? Infinity : 0,
            delay: i * 0.07,
            ease: 'easeInOut',
          }}
          style={{ originY: 1, height: '20px' }}
        />
      ))}
    </div>
  )
}

export default function AudioPlayer() {
  const [expanded, setExpanded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [activeTrack, setActiveTrack] = useState<AudioTrack>(TRACKS[0])
  const [volume, setVolume] = useState(0.6)
  const audioRef = useRef<HTMLAudioElement>(null)

  function selectTrack(track: AudioTrack) {
    setActiveTrack(track)
    setPlaying(false)
  }

  function togglePlay() {
    setPlaying((p) => !p)
  }

  return (
    <div className="fixed bottom-6 right-6 z-30">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="mb-3 rounded-2xl p-4 w-64 flex flex-col gap-3"
            style={{
              background: 'rgba(10,10,30,0.85)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 0 40px rgba(139,92,246,0.2), 0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div className="text-white/50 text-[11px] font-semibold tracking-widest uppercase">
              Ambient Sound
            </div>
            {TRACKS.map((track) => (
              <motion.button
                key={track.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => selectTrack(track)}
                id={`audio-track-${track.id}`}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                  activeTrack.id === track.id
                    ? 'bg-purple-500/20 border border-purple-500/30 text-white'
                    : 'bg-white/4 border border-white/5 text-white/60 hover:text-white hover:bg-white/8'
                }`}
              >
                <span className="text-lg">{track.emoji}</span>
                <span className="text-sm font-medium">{track.label}</span>
                {activeTrack.id === track.id && playing && (
                  <EQWave playing={playing} />
                )}
              </motion.button>
            ))}

            {/* Volume */}
            <div className="flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-white/30" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 accent-purple-500"
                id="audio-volume"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating capsule */}
      <motion.div
        className="flex items-center gap-3 rounded-full px-4 py-3 cursor-pointer select-none"
        style={{
          background: 'rgba(10,10,30,0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139,92,246,0.3)',
          boxShadow: '0 0 30px rgba(139,92,246,0.25), 0 8px 32px rgba(0,0,0,0.4)',
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        {/* Vinyl disc */}
        <motion.div
          animate={{ rotate: playing ? 360 : 0 }}
          transition={{ duration: 3, repeat: playing ? Infinity : 0, ease: 'linear' }}
          className="relative w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-white/10 flex items-center justify-center shrink-0"
        >
          <div className="w-3 h-3 rounded-full bg-purple-400/60" />
          <div className="absolute inset-1 rounded-full border border-white/5" />
        </motion.div>

        {/* Track label */}
        <button onClick={togglePlay} id="audio-play-btn" className="flex flex-col gap-0.5">
          <span className="text-white text-xs font-semibold">
            {activeTrack.emoji} {activeTrack.label}
          </span>
          <div className="flex items-center gap-1">
            <EQWave playing={playing} />
          </div>
        </button>

        {/* Play/Pause */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={togglePlay}
          className="w-7 h-7 rounded-full bg-purple-500/20 hover:bg-purple-500/40 flex items-center justify-center text-purple-400 transition-all"
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </motion.button>

        {/* Expand */}
        <motion.button
          onClick={() => setExpanded((e) => !e)}
          animate={{ rotate: expanded ? 180 : 0 }}
          id="audio-expand-btn"
          className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
        </motion.button>
      </motion.div>

      {/* Hidden audio element */}
      <audio ref={audioRef} loop />
    </div>
  )
}
