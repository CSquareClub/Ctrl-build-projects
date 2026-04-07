import { Clock3 } from 'lucide-react'

import { formatSeconds } from '../plannerUtils'

type TimerDisplayProps = {
  remainingSeconds: number
  isRunning: boolean
}

export function TimerDisplay({ remainingSeconds, isRunning }: TimerDisplayProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-1.5 text-sm font-medium text-[var(--text)]">
      <Clock3 className="h-4 w-4" />
      <span>{formatSeconds(remainingSeconds)}</span>
      <span className={`inline-flex h-2.5 w-2.5 rounded-full ${isRunning ? 'bg-[var(--text)]' : 'bg-[var(--muted)]'}`} />
    </div>
  )
}
