import { useEffect, useMemo, useRef, useState } from 'react'
import { FirebaseError } from 'firebase/app'
import { Timestamp, collection, onSnapshot, type DocumentData } from 'firebase/firestore'

import { db } from '../../../lib/firebase'
import { listenLiveRooms, listenRoomMembers, type Room } from '../../../services/rooms'
import type { SmartRoomLiveStat, UserSession } from '../types'

const toDate = (value: unknown): Date => {
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

const mapSession = (id: string, data: DocumentData): UserSession => ({
  id,
  userId: String(data.userId ?? ''),
  roomId: String(data.roomId ?? ''),
  subject: String(data.subject ?? data.roomTopic ?? data.roomTitle ?? 'General'),
  duration: Number(data.duration ?? 0),
  createdAt: toDate(data.createdAt ?? data.startTime ?? data.endTime),
})

export function useSmartRoomAnalytics() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const memberUnsubsRef = useRef<Map<string, () => void>>(new Map())

  useEffect(() => {
    setLoading(true)
    setError(null)

    const unsubscribeRooms = listenLiveRooms(
      (nextRooms) => {
        setRooms(nextRooms)
        setLoading(false)
      },
      (message) => {
        setError(message)
        setLoading(false)
      },
    )

    return () => {
      unsubscribeRooms()
      memberUnsubsRef.current.forEach((unsubscribe) => unsubscribe())
      memberUnsubsRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const activeRoomIds = new Set(rooms.map((room) => room.id))

    memberUnsubsRef.current.forEach((unsubscribe, roomId) => {
      if (!activeRoomIds.has(roomId)) {
        unsubscribe()
        memberUnsubsRef.current.delete(roomId)
        setMemberCounts((prev) => {
          const next = { ...prev }
          delete next[roomId]
          return next
        })
      }
    })

    rooms.forEach((room) => {
      if (memberUnsubsRef.current.has(room.id)) return

      const unsubscribe = listenRoomMembers(
        room.id,
        (members) => {
          setMemberCounts((prev) => ({ ...prev, [room.id]: members.length }))
        },
        (message) => setError(message),
      )

      memberUnsubsRef.current.set(room.id, unsubscribe)
    })
  }, [rooms])

  useEffect(() => {
    const sessionsRef = collection(db, 'sessions')

    const unsubscribe = onSnapshot(
      sessionsRef,
      (snapshot) => {
        const nextSessions = snapshot.docs
          .map((doc) => mapSession(doc.id, doc.data()))
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        setSessions(nextSessions)
      },
      (err) => {
        if (err instanceof FirebaseError) {
          setError(`Unable to load smart room session metrics (${err.code}).`)
        } else {
          setError('Unable to load smart room session metrics.')
        }
      },
    )

    return unsubscribe
  }, [])

  const liveRoomStats = useMemo<SmartRoomLiveStat[]>(() => {
    return rooms.map((room) => ({
      roomId: room.id,
      roomName: room.name,
      topic: room.topic,
      duration: room.duration,
      memberCount: memberCounts[room.id] ?? 0,
    }))
  }, [memberCounts, rooms])

  return {
    liveRoomStats,
    sessions,
    loading,
    error,
  }
}
