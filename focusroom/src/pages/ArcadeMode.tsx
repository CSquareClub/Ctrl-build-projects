import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Flame,
  Gamepad2,
  Gauge,
  Lock,
  ShieldAlert,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import {
  getDistractionSlayerLeaderboard,
  saveDistractionSlayerSession,
  type ArcadeSessionRecord,
} from '../services/arcadeSessions'

type GameStatus = 'start' | 'playing' | 'result'

type FloatingItem = {
  id: string
  label: string
  kind: 'focus' | 'distraction'
  x: number
  y: number
  vx: number
  vy: number
}

type Burst = {
  id: string
  x: number
  y: number
  good: boolean
}

const FOCUS_ITEMS = ['Study Notes', 'Complete Assignment', 'Read Chapter', 'Solve Problems']
const DISTRACTION_ITEMS = ['Instagram Reel', 'YouTube Shorts', 'Netflix', 'Scrolling Feed']
const ROUND_DURATION_OPTIONS = [30, 45, 60, 90, 120] as const

const focusRating = (accuracy: number, score: number) => {
  if (accuracy >= 88 && score >= 320) return 'Laser Focused'
  if (accuracy >= 65 && score >= 140) return 'Focused'
  return 'Beginner'
}

const levelFromElapsed = (elapsedSeconds: number) => Math.min(6, Math.floor(elapsedSeconds / 10) + 1)

const challengeForDay = () => {
  const day = new Date().getDate()
  const targetScore = 180 + (day % 4) * 30
  const targetAccuracy = 72 + (day % 3) * 6
  return { targetScore, targetAccuracy }
}

export function ArcadeModePage() {
  const { user } = useAuth()
  const [status, setStatus] = useState<GameStatus>('start')
  const [roundDuration, setRoundDuration] = useState<number>(60)
  const [timeLeft, setTimeLeft] = useState(roundDuration)
  const [score, setScore] = useState(0)
  const [comboStreak, setComboStreak] = useState(0)
  const [correctClicks, setCorrectClicks] = useState(0)
  const [wrongClicks, setWrongClicks] = useState(0)
  const [floatingItems, setFloatingItems] = useState<FloatingItem[]>([])
  const [bursts, setBursts] = useState<Burst[]>([])
  const [shakePulse, setShakePulse] = useState(0)
  const [leaderboard, setLeaderboard] = useState<ArcadeSessionRecord[]>([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true)
  const [savingResult, setSavingResult] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const gameFrameRef = useRef<number | null>(null)
  const spawnTimeoutRef = useRef<number | null>(null)
  const gameStartRef = useRef<number>(0)
  const mapRef = useRef<HTMLDivElement | null>(null)

  const accuracy = useMemo(() => {
    const total = correctClicks + wrongClicks
    if (total === 0) return 0
    return Math.round((correctClicks / total) * 100)
  }, [correctClicks, wrongClicks])

  const multiplier = comboStreak >= 5 ? 2 : comboStreak >= 3 ? 1.5 : 1
  const level = useMemo(() => levelFromElapsed(roundDuration - timeLeft), [roundDuration, timeLeft])

  const dailyChallenge = useMemo(() => challengeForDay(), [])
  const challengeCompleted = score >= dailyChallenge.targetScore && accuracy >= dailyChallenge.targetAccuracy

  const unlockedLevel = useMemo(() => {
    if (score >= 360) return 4
    if (score >= 260) return 3
    if (score >= 170) return 2
    return 1
  }, [score])

  const refreshLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true)
    const rows = await getDistractionSlayerLeaderboard()
    setLeaderboard(rows)
    setLoadingLeaderboard(false)
  }, [])

  useEffect(() => {
    void refreshLeaderboard()
  }, [refreshLeaderboard])

  const clearGameLoops = useCallback(() => {
    if (gameFrameRef.current) {
      cancelAnimationFrame(gameFrameRef.current)
      gameFrameRef.current = null
    }

    if (spawnTimeoutRef.current) {
      window.clearTimeout(spawnTimeoutRef.current)
      spawnTimeoutRef.current = null
    }
  }, [])

  const endGame = useCallback(async () => {
    clearGameLoops()
    setStatus('result')
    setFloatingItems([])

    setSavingResult(true)
    setSessionError(null)
    try {
      await saveDistractionSlayerSession({
        userId: user?.uid ?? 'anonymous',
        gameType: 'Distraction Slayer',
        score,
        accuracy,
        duration: roundDuration,
      })
      await refreshLeaderboard()
    } catch (error) {
      if (error instanceof Error) {
        setSessionError(error.message)
      } else {
        setSessionError('Unable to save session right now.')
      }
    } finally {
      setSavingResult(false)
    }
  }, [accuracy, clearGameLoops, refreshLeaderboard, roundDuration, score, user?.uid])

  useEffect(() => {
    if (status !== 'playing') return

    if (timeLeft <= 0) {
      void endGame()
      return
    }

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [endGame, status, timeLeft])

  const spawnItem = useCallback(() => {
    const board = mapRef.current
    if (!board) return

    const rect = board.getBoundingClientRect()
    const elapsed = (Date.now() - gameStartRef.current) / 1000
    const levelNow = levelFromElapsed(elapsed)
    const distractionRatio = Math.min(0.42 + levelNow * 0.07, 0.78)
    const isDistraction = Math.random() < distractionRatio

    const label = isDistraction
      ? DISTRACTION_ITEMS[Math.floor(Math.random() * DISTRACTION_ITEMS.length)]
      : FOCUS_ITEMS[Math.floor(Math.random() * FOCUS_ITEMS.length)]

    const speed = 0.35 + Math.random() * 0.55 + levelNow * 0.12
    const angle = Math.random() * Math.PI * 2

    const item: FloatingItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label,
      kind: isDistraction ? 'distraction' : 'focus',
      x: Math.max(8, Math.random() * (rect.width - 190)),
      y: Math.max(8, Math.random() * (rect.height - 110)),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    }

    setFloatingItems((prev) => [...prev, item].slice(-30))
  }, [])

  useEffect(() => {
    if (status !== 'playing') return

    const spawnLoop = () => {
      const elapsed = (Date.now() - gameStartRef.current) / 1000
      const levelNow = levelFromElapsed(elapsed)
      const interval = Math.max(340, 980 - levelNow * 110)
      const burstCount = Math.min(3, Math.floor(levelNow / 2) + 1)

      for (let i = 0; i < burstCount; i += 1) {
        spawnItem()
      }

      spawnTimeoutRef.current = window.setTimeout(spawnLoop, interval)
    }

    spawnLoop()

    return () => {
      if (spawnTimeoutRef.current) {
        window.clearTimeout(spawnTimeoutRef.current)
        spawnTimeoutRef.current = null
      }
    }
  }, [spawnItem, status])

  useEffect(() => {
    if (status !== 'playing') return

    const step = () => {
      const board = mapRef.current
      if (!board) return
      const rect = board.getBoundingClientRect()

      setFloatingItems((prev) => prev.map((item) => {
        let nextX = item.x + item.vx
        let nextY = item.y + item.vy
        let nextVx = item.vx
        let nextVy = item.vy

        if (nextX < 0 || nextX > rect.width - 180) {
          nextVx = -nextVx
          nextX = Math.max(0, Math.min(nextX, rect.width - 180))
        }

        if (nextY < 0 || nextY > rect.height - 90) {
          nextVy = -nextVy
          nextY = Math.max(0, Math.min(nextY, rect.height - 90))
        }

        return {
          ...item,
          x: nextX,
          y: nextY,
          vx: nextVx,
          vy: nextVy,
        }
      }))

      gameFrameRef.current = requestAnimationFrame(step)
    }

    gameFrameRef.current = requestAnimationFrame(step)

    return () => {
      if (gameFrameRef.current) {
        cancelAnimationFrame(gameFrameRef.current)
        gameFrameRef.current = null
      }
    }
  }, [status])

  const startGame = () => {
    clearGameLoops()
    setStatus('playing')
    setTimeLeft(roundDuration)
    setScore(0)
    setComboStreak(0)
    setCorrectClicks(0)
    setWrongClicks(0)
    setFloatingItems([])
    setBursts([])
    setSessionError(null)
    gameStartRef.current = Date.now()
  }

  const clickItem = (item: FloatingItem) => {
    setFloatingItems((prev) => prev.filter((entry) => entry.id !== item.id))

    const burst = {
      id: `${item.id}-burst`,
      x: item.x + 90,
      y: item.y + 45,
      good: item.kind === 'focus',
    }

    setBursts((prev) => [...prev, burst])
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((entry) => entry.id !== burst.id))
    }, 420)

    if (item.kind === 'focus') {
      setCorrectClicks((prev) => prev + 1)
      setComboStreak((prev) => {
        const next = prev + 1
        const nextMultiplier = next >= 5 ? 2 : next >= 3 ? 1.5 : 1
        setScore((current) => current + Math.round(10 * nextMultiplier))
        return next
      })
      return
    }

    setWrongClicks((prev) => prev + 1)
    setComboStreak(0)
    setScore((current) => current - 15)
    setShakePulse((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />

      <main className="relative ml-0 min-h-screen overflow-hidden p-4 sm:p-6 lg:ml-72 lg:p-8">
        <div className="pointer-events-none absolute inset-0 mesh-bg" />

        <div className="relative grid gap-5 xl:grid-cols-[1fr_320px]">
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm backdrop-blur-xl sm:p-5">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Arcade Mode</p>
                <h1 className="mt-1 font-display text-2xl font-semibold">Distraction Slayer</h1>
              </div>

              <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                <span className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5">Score: {score}</span>
                <span className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5">Combo: {comboStreak}</span>
                <span className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5">x{multiplier.toFixed(1)}</span>
                <span className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5">Time: {timeLeft}s</span>
                <span className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5">Level {level}</span>
              </div>
            </header>

            <motion.div
              ref={mapRef}
              className="relative h-[68vh] min-h-[460px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)]"
              animate={shakePulse > 0 ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
              transition={{ duration: 0.34 }}
            >
              {status === 'start' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg)]/90 px-6 text-center">
                  <Gamepad2 className="h-14 w-14 text-[var(--muted)]" />
                  <h2 className="mt-4 text-3xl font-semibold">Ready to slay distractions?</h2>
                  <p className="mt-3 max-w-xl text-sm text-[var(--muted)] sm:text-base">
                    Click only focus cards and avoid distractions. Speed and chaos will increase every few seconds.
                  </p>

                  <div className="mt-5 w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 text-left">
                    <label htmlFor="round-duration" className="block text-xs font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
                      Round duration
                    </label>
                    <select
                      id="round-duration"
                      value={roundDuration}
                      onChange={(event) => {
                        const nextDuration = Number(event.target.value)
                        setRoundDuration(nextDuration)
                        setTimeLeft(nextDuration)
                      }}
                      className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--text)]"
                    >
                      {ROUND_DURATION_OPTIONS.map((option) => (
                        <option key={option} value={option} className="bg-[var(--card)]">
                          {option} seconds
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={startGame}
                    className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-sm font-semibold text-[var(--text)] transition-colors hover:opacity-90"
                  >
                    Start Distraction Slayer
                  </button>
                </div>
              )}

              {status === 'result' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg)]/90 px-6 text-center">
                  <Trophy className="h-14 w-14 text-[var(--muted)]" />
                  <h2 className="mt-4 text-3xl font-semibold">Session Complete</h2>
                  <p className="mt-3 text-sm text-[var(--muted)]">Focus rating: {focusRating(accuracy, score)}</p>

                  <div className="mt-5 grid w-full max-w-xl gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                      <p className="text-xs text-[var(--muted)]">Score</p>
                      <p className="mt-1 text-xl font-semibold">{score}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                      <p className="text-xs text-[var(--muted)]">Accuracy</p>
                      <p className="mt-1 text-xl font-semibold">{accuracy}%</p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                      <p className="text-xs text-[var(--muted)]">Correct</p>
                      <p className="mt-1 text-xl font-semibold">{correctClicks}</p>
                    </div>
                  </div>

                  {savingResult && <p className="mt-3 text-xs text-[var(--muted)]">Saving session...</p>}
                  {sessionError && <p className="mt-3 text-xs text-[var(--muted)]">{sessionError}</p>}

                  <button
                    type="button"
                    onClick={startGame}
                    className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-sm font-semibold text-[var(--text)] transition-colors hover:opacity-90"
                  >
                    Play Again
                  </button>
                </div>
              )}

              <AnimatePresence>
                {status === 'playing' && floatingItems.map((item) => (
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={() => clickItem(item)}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1, x: item.x, y: item.y }}
                    exit={{ opacity: 0, scale: 0.3 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    className={[
                      'absolute left-0 top-0 min-w-[150px] rounded-2xl border px-3 py-2 text-left text-sm font-medium shadow-sm',
                      item.kind === 'focus'
                        ? 'border-[var(--border)] bg-[var(--card)] text-[var(--text)]'
                        : 'border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text)]',
                    ].join(' ')}
                  >
                    <span className="block text-[11px] uppercase tracking-[0.08em] opacity-90">
                      {item.kind === 'focus' ? 'Focus item' : 'Distraction'}
                    </span>
                    <span className="block text-sm">{item.label}</span>
                  </motion.button>
                ))}
              </AnimatePresence>

              <AnimatePresence>
                {bursts.map((burst) => (
                  <motion.div
                    key={burst.id}
                    initial={{ opacity: 0.9, scale: 0.2 }}
                    animate={{ opacity: 0, scale: 1.4 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ left: burst.x - 35, top: burst.y - 35 }}
                    className={[
                      'pointer-events-none absolute h-[70px] w-[70px] rounded-full border',
                      burst.good
                        ? 'border-[var(--border)] bg-[var(--card)]'
                        : 'border-[var(--border)] bg-[var(--bg-elev)]',
                    ].join(' ')}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 backdrop-blur-xl">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                <Swords className="h-4 w-4" />
                Arcade Tracks
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 font-medium text-[var(--text)]">
                  Distraction Slayer ⭐
                </li>
                <li className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-[var(--muted)]">Focus Sprint (coming soon)</li>
                <li className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-[var(--muted)]">Memory Forge (future)</li>
              </ul>
            </section>

            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 backdrop-blur-xl">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                <Flame className="h-4 w-4" />
                Daily Challenge
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Reach at least {dailyChallenge.targetScore} score and {dailyChallenge.targetAccuracy}% accuracy.
              </p>
              <p className={[
                'mt-2 text-xs font-semibold uppercase tracking-[0.08em]',
                challengeCompleted ? 'text-[var(--text)]' : 'text-[var(--muted)]',
              ].join(' ')}>
                {challengeCompleted ? 'Challenge completed' : 'In progress'}
              </p>
            </section>

            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 backdrop-blur-xl">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                <Zap className="h-4 w-4" />
                Unlock Levels
              </h3>
              <div className="mt-3 space-y-2 text-sm">
                {[1, 2, 3, 4].map((lvl) => (
                  <div
                    key={lvl}
                    className={[
                      'flex items-center justify-between rounded-xl border px-3 py-2',
                      unlockedLevel >= lvl
                        ? 'border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text)]'
                        : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted)]',
                    ].join(' ')}
                  >
                    <span>Level {lvl}</span>
                    {unlockedLevel >= lvl ? <Brain className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 backdrop-blur-xl">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                <Gauge className="h-4 w-4" />
                Leaderboard
              </h3>

              {loadingLeaderboard ? (
                <p className="mt-3 text-sm text-[var(--muted)]">Loading leaderboard...</p>
              ) : leaderboard.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">No sessions recorded yet.</p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {leaderboard.slice(0, 6).map((entry, index) => (
                    <li
                      key={entry.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[var(--text)]">#{index + 1} {entry.userId.slice(0, 8)}</span>
                        <span className="text-[var(--text)]">{entry.score}</span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted)]">Accuracy {Math.round(entry.accuracy)}%</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 backdrop-blur-xl">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                <ShieldAlert className="h-4 w-4" />
                Scoring Rules
              </h3>
              <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
                <li>+10 for each focus click</li>
                <li>-15 for each distraction click</li>
                <li>3 streak: 1.5x multiplier</li>
                <li>5 streak: 2x multiplier</li>
                <li>Round duration: {roundDuration} seconds</li>
              </ul>
            </section>

            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 backdrop-blur-xl">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                <Sparkles className="h-4 w-4" />
                Focus Feedback
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)]">Rating: {focusRating(accuracy, score)}</p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}
