import type {
  LeaderboardChartPoint,
  SessionsPerDayPoint,
  SmartRoomLiveStat,
  SmartRoomTrendPoint,
  SubjectDistributionPoint,
  TopicEngagementPoint,
  UserSession,
  WeeklyFocusPoint,
} from './types'

const dayShort = new Intl.DateTimeFormat('en-US', { weekday: 'short' })

const formatDayKey = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const atStartOfDay = (value: Date) => {
  const next = new Date(value)
  next.setHours(0, 0, 0, 0)
  return next
}

export const buildWeeklyFocusData = (sessions: UserSession[]): WeeklyFocusPoint[] => {
  const today = atStartOfDay(new Date())
  const days: Date[] = []

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    days.push(date)
  }

  const map = new Map<string, number>()
  days.forEach((day) => map.set(formatDayKey(day), 0))

  sessions.forEach((session) => {
    const sessionDay = atStartOfDay(session.createdAt)
    const key = formatDayKey(sessionDay)
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + session.duration)
    }
  })

  return days.map((day) => {
    const key = formatDayKey(day)
    return {
      day: dayShort.format(day),
      minutes: map.get(key) ?? 0,
    }
  })
}

export const buildSessionsPerDayData = (sessions: UserSession[]): SessionsPerDayPoint[] => {
  const today = atStartOfDay(new Date())
  const days: Date[] = []

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    days.push(date)
  }

  const map = new Map<string, number>()
  days.forEach((day) => map.set(formatDayKey(day), 0))

  sessions.forEach((session) => {
    const sessionDay = atStartOfDay(session.createdAt)
    const key = formatDayKey(sessionDay)
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + 1)
    }
  })

  return days.map((day) => {
    const key = formatDayKey(day)
    return {
      day: dayShort.format(day),
      sessions: map.get(key) ?? 0,
    }
  })
}

export const buildSubjectDistributionData = (sessions: UserSession[]): SubjectDistributionPoint[] => {
  const map = new Map<string, number>()

  sessions.forEach((session) => {
    const key = session.subject.trim() || 'General'
    map.set(key, (map.get(key) ?? 0) + session.duration)
  })

  return Array.from(map.entries())
    .map(([subject, minutes]) => ({ subject, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
}

export const buildLeaderboardChartData = (
  users: Array<{ name: string; totalFocusTime: number }>,
): LeaderboardChartPoint[] => {
  return users
    .slice(0, 10)
    .map((user) => ({
      name: user.name.length > 12 ? `${user.name.slice(0, 12)}...` : user.name,
      totalFocusTime: user.totalFocusTime,
    }))
}

export const calculateCurrentStreak = (sessions: UserSession[]): number => {
  if (sessions.length === 0) return 0

  const uniqueDays = new Set(sessions.map((s) => formatDayKey(atStartOfDay(s.createdAt))))
  let streak = 0
  const cursor = atStartOfDay(new Date())

  for (;;) {
    const key = formatDayKey(cursor)
    if (!uniqueDays.has(key)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export const buildSmartRoomTrendData = (sessions: UserSession[]): SmartRoomTrendPoint[] => {
  const today = atStartOfDay(new Date())
  const days: Date[] = []

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    days.push(date)
  }

  const map = new Map<string, { sessions: number; minutes: number }>()
  days.forEach((day) => map.set(formatDayKey(day), { sessions: 0, minutes: 0 }))

  sessions
    .filter((session) => session.roomId.trim().length > 0)
    .forEach((session) => {
      const key = formatDayKey(atStartOfDay(session.createdAt))
      if (!map.has(key)) return

      const current = map.get(key) ?? { sessions: 0, minutes: 0 }
      map.set(key, {
        sessions: current.sessions + 1,
        minutes: current.minutes + session.duration,
      })
    })

  return days.map((day) => {
    const key = formatDayKey(day)
    const value = map.get(key) ?? { sessions: 0, minutes: 0 }
    return {
      day: dayShort.format(day),
      sessions: value.sessions,
      minutes: value.minutes,
    }
  })
}

export const buildLiveRoomMembersData = (rooms: SmartRoomLiveStat[]) => {
  return rooms
    .slice()
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 8)
    .map((room) => ({
      name: room.roomName.length > 16 ? `${room.roomName.slice(0, 16)}...` : room.roomName,
      members: room.memberCount,
    }))
}

export const buildTopicEngagementData = (rooms: SmartRoomLiveStat[]): TopicEngagementPoint[] => {
  const map = new Map<string, number>()

  rooms.forEach((room) => {
    const topic = room.topic.trim() || 'General'
    map.set(topic, (map.get(topic) ?? 0) + room.memberCount)
  })

  return Array.from(map.entries())
    .map(([topic, members]) => ({ topic, members }))
    .sort((a, b) => b.members - a.members)
}
