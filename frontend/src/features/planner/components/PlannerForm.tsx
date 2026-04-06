import { useEffect, useState } from 'react'

import { type PlannerTaskInput, type StudyTask } from '../types'

type PlannerFormProps = {
  isOpen: boolean
  initialTask?: StudyTask | null
  onClose: () => void
  onSubmit: (data: PlannerTaskInput) => void
}

const initialState: PlannerTaskInput = {
  title: '',
  subject: '',
  date: '',
  startTime: '',
  duration: 45,
  priority: 'medium',
}

export function PlannerForm({ isOpen, initialTask, onClose, onSubmit }: PlannerFormProps) {
  const [form, setForm] = useState<PlannerTaskInput>(initialState)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    if (initialTask) {
      setForm({
        title: initialTask.title,
        subject: initialTask.subject,
        date: initialTask.date,
        startTime: initialTask.startTime,
        duration: initialTask.duration,
        priority: initialTask.priority,
      })
      setError(null)
      return
    }

    setForm({ ...initialState, date: new Date().toISOString().slice(0, 10) })
    setError(null)
  }, [initialTask, isOpen])

  if (!isOpen) return null

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.title.trim() || !form.subject.trim() || !form.date || !form.startTime) {
      setError('Please fill all required fields.')
      return
    }

    if (Number.isNaN(form.duration) || form.duration < 15 || form.duration > 600) {
      setError('Duration must be between 15 and 600 minutes.')
      return
    }

    onSubmit({
      ...form,
      duration: Math.round(form.duration),
      title: form.title.trim(),
      subject: form.subject.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_24px_60px_rgba(2,8,24,0.28)]">
        <h2 className="text-xl font-semibold text-[var(--text)]">{initialTask ? 'Edit Session' : 'Add Study Session'}</h2>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-[var(--muted)]">
              <span>Title *</span>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="space-y-1 text-sm text-[var(--muted)]">
              <span>Subject *</span>
              <input
                type="text"
                value={form.subject}
                onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-sm text-[var(--muted)]">
              <span>Date *</span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="space-y-1 text-sm text-[var(--muted)]">
              <span>Start Time *</span>
              <input
                type="time"
                value={form.startTime}
                onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="space-y-1 text-sm text-[var(--muted)]">
              <span>Duration (min) *</span>
              <input
                type="number"
                min={15}
                max={600}
                step={5}
                value={form.duration}
                onChange={(event) => setForm((prev) => ({ ...prev, duration: Number(event.target.value) }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          <label className="space-y-1 text-sm text-[var(--muted)]">
            <span>Priority</span>
            <select
              value={form.priority}
              onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as PlannerTaskInput['priority'] }))}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          {error && <p className="text-sm text-[var(--muted)]">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-sm text-[var(--muted)] hover:opacity-90"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] px-4 py-2 text-sm font-medium text-[var(--accent)] hover:opacity-90"
            >
              {initialTask ? 'Save Changes' : 'Add Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
