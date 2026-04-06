export type UserSession = {
  id: string
  userId: string
  roomId: string
  subject: string
  duration: number
  createdAt: Date
}

export type LeaderboardUser = {
  id: string
  name: string
  email: string
  totalFocusTime: number
  sessions: number
  streak: number
}

export type WeeklyFocusPoint = {
  day: string
  minutes: number
}

export type SessionsPerDayPoint = {
  day: string
  sessions: number
}

export type SubjectDistributionPoint = {
  subject: string
  minutes: number
}

export type LeaderboardChartPoint = {
  name: string
  totalFocusTime: number
}

export type SmartRoomLiveStat = {
  roomId: string
  roomName: string
  topic: string
  duration: number
  memberCount: number
}

export type SmartRoomTrendPoint = {
  day: string
  sessions: number
  minutes: number
}

export type TopicEngagementPoint = {
  topic: string
  members: number
}
