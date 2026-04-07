import { useEffect, useState } from 'react'
import { FirebaseError } from 'firebase/app'
import { collection, onSnapshot, query, where, type DocumentData, Timestamp } from 'firebase/firestore'

import { db } from '../../../lib/firebase'
import type { UserSession } from '../types'

const toDate = (value: unknown): Date => {
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

const mapSession = (id: string, data: DocumentData): UserSession => {
  const createdAt = toDate(data.createdAt ?? data.startTime ?? data.endTime)

  return {
    id,
    userId: String(data.userId ?? ''),
    roomId: String(data.roomId ?? ''),
    subject: String(data.subject ?? data.roomTopic ?? data.roomTitle ?? 'General'),
    duration: Number(data.duration ?? 0),
    createdAt,
  }
}

export function useUserSessions(userId: string | undefined) {
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setSessions([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const sessionsRef = collection(db, 'sessions')
    const q = query(sessionsRef, where('userId', '==', userId))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nextSessions = snapshot.docs
          .map((doc) => mapSession(doc.id, doc.data()))
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

        setSessions(nextSessions)
        setLoading(false)
      },
      (err) => {
        if (err instanceof FirebaseError) {
          setError(`Unable to load sessions (${err.code}).`)
        } else {
          setError('Unable to load sessions.')
        }
        setLoading(false)
      },
    )

    return unsubscribe
  }, [userId])

  return { sessions, loading, error }
}
