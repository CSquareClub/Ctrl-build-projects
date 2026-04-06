export type FocusStatus = 'focused' | 'warning' | 'distracted'

export interface User {
  id: number
  name: string
  task: string
  streak: number
  status: FocusStatus
  totalMinutes: number
}

export interface Duel {
  challenger: User
  target: User
  startedAt: number
  durationMinutes: number
}

export interface Toast {
  id: string
  type: 'distraction' | 'duel' | 'session' | 'streak' | 'info'
  title: string
  message: string
}

export interface Task {
  id: string
  label: string
  color: string
}

export type AudioTrack = {
  id: string
  label: string
  emoji: string
  src: string
}
