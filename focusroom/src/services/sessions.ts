import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'

import { db } from '../lib/firebase'

export type SessionInput = {
  userId: string
  roomId: string
  roomTitle: string
  roomTopic?: string
  memberCount?: number
  startTime: Date
  endTime: Date
  duration: number
}

export type SessionRecord = {
  id: string
  userId: string
  roomId: string
  roomTitle: string
  roomTopic: string
  memberCount: number
  startTime: Timestamp
  endTime: Timestamp
  duration: number
}

const localSessionKey = (userId: string) => `focusroom:sessions:${userId}`

const toTimestamp = (value: unknown, fallback: Date): Timestamp => {
  if (value instanceof Timestamp) {
    return value
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Timestamp.fromDate(value)
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return Timestamp.fromDate(parsed)
    }
  }

  return Timestamp.fromDate(fallback)
}

const readLocalSessions = (userId: string): SessionRecord[] => {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem(localSessionKey(userId))
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Array<{
      id: string
      userId: string
      roomId: string
      roomTitle: string
      roomTopic?: string
      memberCount?: number
      startTime?: string
      endTime?: string
      duration?: number
    }>

    return parsed.map((session) => ({
      ...session,
      roomTopic: String(session.roomTopic ?? ''),
      memberCount: Number(session.memberCount ?? 0),
      duration: Number(session.duration ?? 0),
      startTime: toTimestamp(session.startTime, new Date()),
      endTime: toTimestamp(session.endTime, new Date()),
    }))
  } catch {
    return []
  }
}

const writeLocalSession = (session: SessionInput) => {
  if (typeof window === 'undefined') {
    return
  }

  const current = readLocalSessions(session.userId).map((item) => ({
    ...item,
    startTime: item.startTime.toDate().toISOString(),
    endTime: item.endTime.toDate().toISOString(),
  }))

  current.push({
    id: `local-${Date.now()}`,
    userId: session.userId,
    roomId: session.roomId,
    roomTitle: session.roomTitle,
    roomTopic: session.roomTopic ?? '',
    memberCount: session.memberCount ?? 0,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime.toISOString(),
    duration: session.duration,
  })

  window.localStorage.setItem(localSessionKey(session.userId), JSON.stringify(current))
}

const mapSession = (id: string, data: DocumentData): SessionRecord => {
  const fallbackStart = new Date()
  const start = toTimestamp(data.startTime, fallbackStart)
  const fallbackEnd = new Date(start.toMillis() + Number(data.duration ?? 0) * 60_000)

  return {
    id,
    userId: String(data.userId ?? ''),
    roomId: String(data.roomId ?? ''),
    roomTitle: String(data.roomTitle ?? ''),
    roomTopic: String(data.roomTopic ?? ''),
    memberCount: Number(data.memberCount ?? 0),
    startTime: start,
    endTime: toTimestamp(data.endTime, fallbackEnd),
    duration: Number(data.duration ?? 0),
  }
}

export const saveSession = async (session: SessionInput) => {
  const sessionsRef = collection(db, 'sessions')

  try {
    await addDoc(sessionsRef, {
      userId: session.userId,
      roomId: session.roomId,
      roomTitle: session.roomTitle,
      roomTopic: session.roomTopic ?? '',
      memberCount: session.memberCount ?? 0,
      startTime: Timestamp.fromDate(session.startTime),
      endTime: Timestamp.fromDate(session.endTime),
      duration: session.duration,
    })
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'permission-denied') {
      writeLocalSession(session)
      return
    }
    throw error
  }
}

export const getSessionsByUser = async (userId: string): Promise<SessionRecord[]> => {
  const sessionsRef = collection(db, 'sessions')
  const q = query(sessionsRef, where('userId', '==', userId))

  try {
    const snapshot = await getDocs(q)

    return snapshot.docs
      .map((sessionDoc) => mapSession(sessionDoc.id, sessionDoc.data()))
      .sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis())
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'permission-denied') {
      return readLocalSessions(userId).sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis())
    }
    throw error
  }
}
