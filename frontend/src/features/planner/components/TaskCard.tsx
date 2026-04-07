import { CalendarDays, CheckCircle2, Pause, Pencil, Play, RotateCcw, Trash2 } from 'lucide-react'

import { TimerDisplay } from './TimerDisplay'
import { type StudyTask } from '../types'

type TaskCardProps = {
  task: StudyTask
  remainingSeconds: number
  isActive: boolean
  onEdit: (task: StudyTask) => void
  onDelete: (taskId: string) => void
  onToggleStatus: (taskId: string) => void
  onStart: (taskId: string) => void
  onPause: (taskId: string) => void
  onResume: (taskId: string) => void
  taskRef?: (node: HTMLDivElement | null) => void
}

const priorityBadge = {
  low: 'border-[var(--border)] bg-[var(--bg-elev)] text-[var(--muted)]',
  medium: 'border-[var(--border)] bg-[var(--bg-elev)] text-[var(--muted)]',
  high: 'border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text)]',
} as const

const statusBadge = {
  pending: 'border-[var(--border)] bg-[var(--bg-elev)] text-[var(--muted)]',
  completed: 'border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text)]',
} as const

export function TaskCard({
  task,
  remainingSeconds,
  isActive,
  onEdit,
  onDelete,
  onToggleStatus,
  onStart,
  onPause,
  onResume,
  taskRef,
}: TaskCardProps) {
  const canResume = !task.isRunning && task.status !== 'completed' && remainingSeconds > 0 && remainingSeconds < task.duration * 60

  return (
    <article
      ref={taskRef}
      className={[
        'rounded-2xl border p-4 shadow-[var(--card-shadow)] transition-all',
        isActive
          ? 'border-[var(--text)] bg-[var(--bg-elev)] ring-1 ring-[var(--text)]/20'
          : 'border-[var(--border)] bg-[var(--card)]',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text)]">{task.title}</h3>
          <p className="text-sm text-[var(--muted)]">{task.subject}</p>
        </div>
        <div className="flex gap-2 text-[11px] uppercase tracking-[0.08em]">
          <span className={`rounded-full border px-2 py-1 ${priorityBadge[task.priority]}`}>
            {task.priority}
          </span>
          <span className={`rounded-full border px-2 py-1 ${statusBadge[task.status]}`}>
            {task.status}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {task.date} • {task.startTime}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-1.5">
          Duration: {task.duration} min
        </span>
        <TimerDisplay remainingSeconds={remainingSeconds} isRunning={task.isRunning} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onEdit(task)}
          disabled={task.isRunning}
          className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-1.5 text-xs font-medium text-[var(--text)] enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:opacity-90"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
        {task.isRunning ? (
          <button
            type="button"
            onClick={() => onPause(task.id)}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:opacity-90"
          >
            <Pause className="h-3.5 w-3.5" />
            Pause
          </button>
        ) : canResume ? (
          <button
            type="button"
            onClick={() => onResume(task.id)}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:opacity-90"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Resume
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onStart(task.id)}
            disabled={task.status === 'completed'}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--text)] px-3 py-1.5 text-xs font-medium text-[var(--bg)] enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            Start
          </button>
        )}
        <button
          type="button"
          onClick={() => onToggleStatus(task.id)}
          className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:opacity-90"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {task.status === 'completed' ? 'Mark Pending' : 'Complete'}
        </button>
      </div>
    </article>
  )
}
