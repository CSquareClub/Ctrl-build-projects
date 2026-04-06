import { CalendarCheck2, Filter, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { PlannerForm } from '../features/planner/components/PlannerForm'
import { ProgressBar } from '../features/planner/components/ProgressBar'
import { TaskCard } from '../features/planner/components/TaskCard'
import { usePlannerTasks } from '../features/planner/usePlannerTasks'
import { type PlannerTaskInput, type StudyTask, type TaskStatus } from '../features/planner/types'

const currentUser = { id: 'user_123', name: 'Satyam' }

const groupBySubject = (tasks: StudyTask[]) => {
  return tasks.reduce<Record<string, StudyTask[]>>((groups, task) => {
    const key = task.subject
    groups[key] = groups[key] ? [...groups[key], task] : [task]
    return groups
  }, {})
}

export function StudyPlannerPage() {
  const { user } = useAuth()
  const activeUser = {
    id: user?.uid ?? currentUser.id,
    name: user?.displayName ?? currentUser.name,
  }

  const {
    tasks,
    activeTaskId,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    startTimer,
    pauseTimer,
    resumeTimer,
    getTaskRemainingTime,
    getTodayTasks,
    getUpcomingTasks,
    getDailyProgress,
  } = usePlannerTasks(activeUser.id)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [dailyGoal, setDailyGoal] = useState(180)
  const taskRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const today = new Date().toISOString().slice(0, 10)

  const applySearchAndStatusFilter = (list: StudyTask[]) => {
    return list.filter((task) => {
      const matchesSearch = searchTerm.trim()
        ? `${task.title} ${task.subject}`.toLowerCase().includes(searchTerm.toLowerCase())
        : true

      const matchesStatus = statusFilter === 'all' ? true : task.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }

  const todayTasks = useMemo(() => applySearchAndStatusFilter(getTodayTasks()), [getTodayTasks, searchTerm, statusFilter])
  const upcomingTasks = useMemo(() => applySearchAndStatusFilter(getUpcomingTasks()), [getUpcomingTasks, searchTerm, statusFilter])

  const groupedUpcomingTasks = useMemo(() => groupBySubject(upcomingTasks), [upcomingTasks])

  const progress = useMemo(
    () => getDailyProgress(today, dailyGoal),
    [dailyGoal, getDailyProgress, tasks, today],
  )

  const handleCreate = () => {
    setEditingTask(null)
    setIsFormOpen(true)
  }

  const handleEdit = (task: StudyTask) => {
    setEditingTask(task)
    setIsFormOpen(true)
  }

  const handleSubmit = (data: PlannerTaskInput) => {
    if (editingTask) {
      updateTask(editingTask.id, data)
    } else {
      addTask(data)
    }
    setIsFormOpen(false)
    setEditingTask(null)
  }

  useEffect(() => {
    if (!activeTaskId) return

    const node = taskRefs.current[activeTaskId]
    if (!node) return

    node.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeTaskId])

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />

      <main className="relative ml-0 min-h-screen overflow-hidden p-4 sm:p-6 lg:ml-72 lg:p-8">
        <div className="pointer-events-none absolute inset-0 mesh-bg" />

        <div className="relative mx-auto max-w-6xl space-y-5">
          <header className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Welcome back, {activeUser.name}</p>
                <h1 className="mt-1 text-3xl font-semibold">Study Planner</h1>
              </div>
              <button
                type="button"
                onClick={handleCreate}
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--text)] px-4 py-2 text-sm font-medium text-[var(--bg)] hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Add Session
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_150px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by title or subject"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] py-2 pl-9 pr-3 text-sm text-[var(--text)] outline-none focus:border-[var(--text)]"
                />
              </label>

              <label className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as TaskStatus | 'all')}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] py-2 pl-9 pr-3 text-sm text-[var(--text)] outline-none focus:border-[var(--text)]"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </label>

              <label>
                <input
                  type="number"
                  min={30}
                  max={720}
                  value={dailyGoal}
                  onChange={(event) => setDailyGoal(Math.min(720, Math.max(30, Number(event.target.value) || 30)))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--text)]"
                />
                <span className="mt-1 block text-xs text-[var(--muted)]">Daily goal (minutes)</span>
              </label>
            </div>

          </header>

          <ProgressBar
            completedDuration={progress.completedDuration}
            dailyGoal={progress.dailyGoal}
            progressPercent={progress.progressPercent}
          />

          <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="mb-4 flex items-center gap-2">
              <CalendarCheck2 className="h-4 w-4 text-[var(--muted)]" />
              <h2 className="text-xl font-semibold">Today&apos;s Tasks</h2>
            </div>

            {todayTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-elev)] p-6 text-center text-sm text-[var(--muted)]">
                No tasks for today. Add a new study session to get started.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {todayTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    remainingSeconds={getTaskRemainingTime(task)}
                    isActive={task.id === activeTaskId}
                    onEdit={handleEdit}
                    onDelete={deleteTask}
                    onToggleStatus={toggleTaskStatus}
                    onStart={startTimer}
                    onPause={pauseTimer}
                    onResume={resumeTimer}
                    taskRef={(node) => {
                      taskRefs.current[task.id] = node
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="mb-4 text-xl font-semibold">Upcoming Tasks</h2>

            {upcomingTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-elev)] p-6 text-center text-sm text-[var(--muted)]">
                No upcoming sessions yet. Plan your next sessions to stay ahead.
              </div>
            ) : (
              <div className="space-y-5">
                {Object.entries(groupedUpcomingTasks).map(([subject, subjectTasks]) => (
                  <div key={subject}>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{subject}</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {subjectTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          remainingSeconds={getTaskRemainingTime(task)}
                          isActive={task.id === activeTaskId}
                          onEdit={handleEdit}
                          onDelete={deleteTask}
                          onToggleStatus={toggleTaskStatus}
                          onStart={startTimer}
                          onPause={pauseTimer}
                          onResume={resumeTimer}
                          taskRef={(node) => {
                            taskRefs.current[task.id] = node
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <PlannerForm
        isOpen={isFormOpen}
        initialTask={editingTask}
        onClose={() => {
          setIsFormOpen(false)
          setEditingTask(null)
        }}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
