export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'pending' | 'completed'

export type StudyTask = {
  id: string
  userId: string
  title: string
  subject: string
  date: string
  startTime: string
  duration: number
  remainingTime: number
  startTimestamp: number | null
  isRunning: boolean
  priority: TaskPriority
  status: TaskStatus
  createdAt: string
}

export type PlannerTaskInput = {
  title: string
  subject: string
  date: string
  startTime: string
  duration: number
  priority: TaskPriority
}
