import { type PlannerTaskInput, type StudyTask } from './types'

const toDateTimeValue = (task: Pick<StudyTask, 'date' | 'startTime'>) => `${task.date}T${task.startTime}`

export const secondsFromDurationMinutes = (minutes: number) => Math.max(0, Math.round(minutes * 60))

export const getLiveRemainingSeconds = (task: StudyTask, now: number = Date.now()) => {
  if (!task.isRunning || task.startTimestamp == null) {
    return Math.max(0, Math.round(task.remainingTime))
  }

  const elapsedSeconds = (now - task.startTimestamp) / 1000
  return Math.max(0, Math.round(task.remainingTime - elapsedSeconds))
}

export const formatSeconds = (seconds: number) => {
  const safe = Math.max(0, Math.round(seconds))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export const sortTasksByDateTime = (tasks: StudyTask[]) => {
  return [...tasks].sort((a, b) => toDateTimeValue(a).localeCompare(toDateTimeValue(b)))
}

export const addTask = (
  tasks: StudyTask[],
  userId: string,
  taskData: PlannerTaskInput,
): StudyTask[] => {
  const taskDuration = normalizeTaskDuration(taskData.duration)

  const nextTask: StudyTask = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    userId,
    title: taskData.title.trim(),
    subject: taskData.subject.trim(),
    date: taskData.date,
    startTime: taskData.startTime,
    duration: taskDuration,
    remainingTime: secondsFromDurationMinutes(taskDuration),
    startTimestamp: null,
    isRunning: false,
    priority: taskData.priority,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  return sortTasksByDateTime([...tasks, nextTask])
}

export const updateTask = (
  tasks: StudyTask[],
  taskId: string,
  updates: Partial<Omit<StudyTask, 'id' | 'createdAt' | 'userId'>>,
): StudyTask[] => {
  return sortTasksByDateTime(tasks.map((task) => {
    if (task.id !== taskId) return task

    const nextDuration = typeof updates.duration === 'number'
      ? normalizeTaskDuration(updates.duration)
      : task.duration
    const shouldResetRemaining = typeof updates.duration === 'number' && !task.isRunning && task.status !== 'completed'

    return {
      ...task,
      ...updates,
      duration: nextDuration,
      remainingTime: shouldResetRemaining ? secondsFromDurationMinutes(nextDuration) : task.remainingTime,
      title: updates.title?.trim() ?? task.title,
      subject: updates.subject?.trim() ?? task.subject,
    }
  }))
}

export const deleteTask = (tasks: StudyTask[], taskId: string): StudyTask[] => {
  return tasks.filter((task) => task.id !== taskId)
}

export const toggleTaskStatus = (tasks: StudyTask[], taskId: string): StudyTask[] => {
  return tasks.map((task) => {
    if (task.id !== taskId) return task

    const isCompleting = task.status === 'pending'

    return {
      ...task,
      status: isCompleting ? 'completed' : 'pending',
      isRunning: false,
      startTimestamp: null,
      remainingTime: isCompleting
        ? 0
        : task.remainingTime > 0
          ? task.remainingTime
          : secondsFromDurationMinutes(task.duration),
    }
  })
}

export const stopAllTimers = (tasks: StudyTask[], now: number = Date.now()): StudyTask[] => {
  return tasks.map((task) => {
    if (!task.isRunning) return task

    return {
      ...task,
      remainingTime: getLiveRemainingSeconds(task, now),
      isRunning: false,
      startTimestamp: null,
    }
  })
}

export const startTimer = (tasks: StudyTask[], taskId: string, now: number = Date.now()): StudyTask[] => {
  const paused = stopAllTimers(tasks, now)

  return paused.map((task) => {
    if (task.id !== taskId) return task

    const resetRemaining = task.remainingTime > 0 ? task.remainingTime : secondsFromDurationMinutes(task.duration)

    return {
      ...task,
      status: 'pending',
      remainingTime: resetRemaining,
      isRunning: true,
      startTimestamp: now,
    }
  })
}

export const pauseTimer = (tasks: StudyTask[], taskId: string, now: number = Date.now()) => {
  return tasks.map((task) => {
    if (task.id !== taskId || !task.isRunning) return task

    return {
      ...task,
      remainingTime: getLiveRemainingSeconds(task, now),
      isRunning: false,
      startTimestamp: null,
    }
  })
}

export const resumeTimer = (tasks: StudyTask[], taskId: string, now: number = Date.now()): StudyTask[] => {
  const paused = stopAllTimers(tasks, now)

  return paused.map((task) => {
    if (task.id !== taskId) return task
    if (task.status === 'completed') return task

    const remaining = task.remainingTime > 0 ? task.remainingTime : secondsFromDurationMinutes(task.duration)

    return {
      ...task,
      remainingTime: remaining,
      isRunning: true,
      startTimestamp: now,
    }
  })
}

export const reconcileRunningTasks = (tasks: StudyTask[], now: number = Date.now()): StudyTask[] => {
  const running = tasks.filter((task) => task.isRunning)

  if (running.length <= 1) {
    return tasks.map((task) => {
      if (!task.isRunning || task.startTimestamp == null) return task
      const liveRemaining = getLiveRemainingSeconds(task, now)

      if (liveRemaining > 0) return task

      return {
        ...task,
        remainingTime: 0,
        startTimestamp: null,
        isRunning: false,
        status: 'completed',
      }
    })
  }

  const [kept, ...rest] = [...running].sort((a, b) => {
    const aStamp = a.startTimestamp ?? 0
    const bStamp = b.startTimestamp ?? 0
    return bStamp - aStamp
  })

  const stoppedIds = new Set(rest.map((task) => task.id))

  return tasks.map((task) => {
    if (task.id === kept.id) {
      const liveRemaining = getLiveRemainingSeconds(task, now)
      if (liveRemaining <= 0) {
        return {
          ...task,
          remainingTime: 0,
          startTimestamp: null,
          isRunning: false,
          status: 'completed',
        }
      }
      return task
    }

    if (!stoppedIds.has(task.id)) return task

    return {
      ...task,
      remainingTime: getLiveRemainingSeconds(task, now),
      isRunning: false,
      startTimestamp: null,
    }
  })
}

export const getTodayTasks = (tasks: StudyTask[], userId: string): StudyTask[] => {
  const today = new Date().toISOString().slice(0, 10)
  return sortTasksByDateTime(tasks.filter((task) => task.userId === userId && task.date === today))
}

export const getUpcomingTasks = (tasks: StudyTask[], userId: string): StudyTask[] => {
  const today = new Date().toISOString().slice(0, 10)

  return sortTasksByDateTime(
    tasks.filter((task) => task.userId === userId && task.date > today),
  )
}

export const getDailyProgress = (
  tasks: StudyTask[],
  userId: string,
  selectedDate: string,
  dailyGoal: number,
) => {
  const dayTasks = tasks.filter((task) => task.userId === userId && task.date === selectedDate)
  const completedDuration = dayTasks
    .filter((task) => task.status === 'completed')
    .reduce((sum, task) => sum + task.duration, 0)

  const progressPercent = dailyGoal > 0
    ? Math.min(100, Math.round((completedDuration / dailyGoal) * 100))
    : 0

  return {
    completedDuration,
    dailyGoal,
    progressPercent,
  }
}

export const normalizeTaskDuration = (duration: number) => {
  return Math.min(600, Math.max(15, Math.round(duration)))
}
