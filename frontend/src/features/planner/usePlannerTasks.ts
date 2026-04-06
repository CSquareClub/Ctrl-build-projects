import { useEffect, useMemo, useRef, useState } from 'react'

import {
  addTask,
  deleteTask,
  getLiveRemainingSeconds,
  getDailyProgress,
  getTodayTasks,
  getUpcomingTasks,
  pauseTimer,
  reconcileRunningTasks,
  resumeTimer,
  secondsFromDurationMinutes,
  sortTasksByDateTime,
  startTimer,
  stopAllTimers,
  toggleTaskStatus,
  updateTask,
} from './plannerUtils'
import { type PlannerTaskInput, type StudyTask, type TaskStatus } from './types'

const TASKS_STORAGE_KEY = 'focusroom.studyPlanner.tasks.v1'
const LAST_ACTIVE_TASK_STORAGE_KEY = 'focusroom.studyPlanner.lastActiveTask.v1'

const readTasksFromStorage = () => {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(TASKS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StudyTask[]
    if (!Array.isArray(parsed)) return []

    const normalized = parsed.map((task): StudyTask => {
      const normalizedStatus: TaskStatus = task.status === 'completed' ? 'completed' : 'pending'

      return {
      ...task,
      status: normalizedStatus,
      remainingTime: typeof task.remainingTime === 'number'
        ? task.remainingTime
        : secondsFromDurationMinutes(task.duration),
      startTimestamp: typeof task.startTimestamp === 'number' ? task.startTimestamp : null,
      isRunning: typeof task.isRunning === 'boolean' ? task.isRunning : false,
      }
    })

    return sortTasksByDateTime(reconcileRunningTasks(normalized))
  } catch {
    return []
  }
}

const playTimerCompleteSound = () => {
  if (typeof window === 'undefined') return

  try {
    const audioContext = new window.AudioContext()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = 'triangle'
    oscillator.frequency.value = 880
    gain.gain.value = 0.001

    oscillator.connect(gain)
    gain.connect(audioContext.destination)

    const now = audioContext.currentTime
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    oscillator.start(now)
    oscillator.stop(now + 0.36)

    window.setTimeout(() => {
      void audioContext.close()
    }, 450)
  } catch {
    // Ignore audio failures, they can occur without user gesture permissions.
  }
}

export function usePlannerTasks(userId: string) {
  const [tasks, setTasks] = useState<StudyTask[]>(() => readTasksFromStorage())
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now())
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    const activeTask = tasks.find((task) => task.userId === userId && task.isRunning)

    if (!activeTask) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    if (intervalRef.current) return

    intervalRef.current = window.setInterval(() => {
      setNowTimestamp(Date.now())
    }, 1000)

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [tasks, userId])

  useEffect(() => {
    const activeTask = tasks.find((task) => task.userId === userId && task.isRunning)
    if (!activeTask) return

    const remaining = getLiveRemainingSeconds(activeTask, nowTimestamp)
    if (remaining > 0) return

    setTasks((prev) => prev.map((task) => {
      if (task.id !== activeTask.id) return task
      return {
        ...task,
        remainingTime: 0,
        isRunning: false,
        startTimestamp: null,
        status: 'completed',
      }
    }))

    window.localStorage.removeItem(LAST_ACTIVE_TASK_STORAGE_KEY)
    playTimerCompleteSound()
  }, [nowTimestamp, tasks, userId])

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
    }
  }, [])

  const userTasks = useMemo(
    () => sortTasksByDateTime(tasks.filter((task) => task.userId === userId)),
    [tasks, userId],
  )

  const activeTaskId = useMemo(() => {
    const activeTask = userTasks.find((task) => task.isRunning)
    return activeTask?.id ?? null
  }, [userTasks])

  const addPlannerTask = (taskData: PlannerTaskInput) => {
    setTasks((prev) => addTask(prev, userId, taskData))
  }

  const updatePlannerTask = (
    taskId: string,
    updates: Partial<Omit<StudyTask, 'id' | 'userId' | 'createdAt'>>,
  ) => {
    setTasks((prev) => updateTask(prev, taskId, updates))
  }

  const deletePlannerTask = (taskId: string) => {
    setTasks((prev) => deleteTask(prev, taskId))
    const currentActive = window.localStorage.getItem(LAST_ACTIVE_TASK_STORAGE_KEY)
    if (currentActive === taskId) {
      window.localStorage.removeItem(LAST_ACTIVE_TASK_STORAGE_KEY)
    }
  }

  const togglePlannerTaskStatus = (taskId: string) => {
    setTasks((prev) => toggleTaskStatus(prev, taskId))
    const currentActive = window.localStorage.getItem(LAST_ACTIVE_TASK_STORAGE_KEY)
    if (currentActive === taskId) {
      window.localStorage.removeItem(LAST_ACTIVE_TASK_STORAGE_KEY)
    }
  }

  const startPlannerTimer = (taskId: string) => {
    const now = Date.now()
    setTasks((prev) => startTimer(prev, taskId, now))
    window.localStorage.setItem(LAST_ACTIVE_TASK_STORAGE_KEY, taskId)
    setNowTimestamp(now)
  }

  const pausePlannerTimer = (taskId: string) => {
    const now = Date.now()
    setTasks((prev) => pauseTimer(prev, taskId, now))
    window.localStorage.removeItem(LAST_ACTIVE_TASK_STORAGE_KEY)
    setNowTimestamp(now)
  }

  const resumePlannerTimer = (taskId: string) => {
    const now = Date.now()
    setTasks((prev) => resumeTimer(prev, taskId, now))
    window.localStorage.setItem(LAST_ACTIVE_TASK_STORAGE_KEY, taskId)
    setNowTimestamp(now)
  }

  const stopPlannerTimers = () => {
    const now = Date.now()
    setTasks((prev) => stopAllTimers(prev, now))
    window.localStorage.removeItem(LAST_ACTIVE_TASK_STORAGE_KEY)
    setNowTimestamp(now)
  }

  const getTaskRemainingTime = (task: StudyTask) => getLiveRemainingSeconds(task, nowTimestamp)

  const getTodayPlannerTasks = () => getTodayTasks(tasks, userId)

  const getUpcomingPlannerTasks = () => getUpcomingTasks(tasks, userId)

  const getPlannerDailyProgress = (selectedDate: string, dailyGoal: number) => {
    return getDailyProgress(tasks, userId, selectedDate, dailyGoal)
  }

  return {
    tasks: userTasks,
    activeTaskId,
    nowTimestamp,
    addTask: addPlannerTask,
    updateTask: updatePlannerTask,
    deleteTask: deletePlannerTask,
    toggleTaskStatus: togglePlannerTaskStatus,
    startTimer: startPlannerTimer,
    pauseTimer: pausePlannerTimer,
    resumeTimer: resumePlannerTimer,
    stopAllTimers: stopPlannerTimers,
    getTaskRemainingTime,
    getTodayTasks: getTodayPlannerTasks,
    getUpcomingTasks: getUpcomingPlannerTasks,
    getDailyProgress: getPlannerDailyProgress,
  }
}
