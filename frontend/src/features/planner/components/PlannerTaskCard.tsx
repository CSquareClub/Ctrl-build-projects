import { CalendarDays, CheckCircle2, Clock3, Pencil, Trash2 } from 'lucide-react'

import { type StudyTask } from '../types'

type PlannerTaskCardProps = {
  task: StudyTask
  onEdit: (task: StudyTask) => void
  onDelete: (taskId: string) => void
  onToggleStatus: (taskId: string) => void
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

export function PlannerTaskCard({ task, onEdit, onDelete, onToggleStatus }: PlannerTaskCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--card-shadow)]">
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

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {task.date}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-1.5">
          <Clock3 className="h-3.5 w-3.5" />
          {task.startTime} • {task.duration} min
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:opacity-90"
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
