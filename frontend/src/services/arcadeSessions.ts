import { FirebaseError } from 'firebase/app'
import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'

import { db } from '../lib/firebase'

export type ArcadeSessionInput = {
  userId: string
  gameType: 'Distraction Slayer'
  score: number
  accuracy: number
  duration: number
}

export type ArcadeSessionRecord = {
  id: string
  userId: string
  gameType: string
  score: number
  accuracy: number
  duration: number
  createdAt: number
}

const LOCAL_KEY = 'focusroom:arcade:distraction-slayer:sessions'

const readLocal = (): ArcadeSessionRecord[] => {
  if (typeof window === 'undefined') return []

  const raw = window.localStorage.getItem(LOCAL_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as ArcadeSessionRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeLocal = (session: ArcadeSessionInput) => {
  if (typeof window === 'undefined') return

  const current = readLocal()
  current.push({
    id: `local-${Date.now()}`,
    userId: session.userId,
    gameType: session.gameType,
    score: session.score,
    accuracy: session.accuracy,
    duration: session.duration,
    createdAt: Date.now(),
  })

  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(current))
}

export const saveDistractionSlayerSession = async (session: ArcadeSessionInput) => {
  writeLocal(session)

  try {
    await addDoc(collection(db, 'sessions'), {
      userId: session.userId,
      gameType: session.gameType,
      score: session.score,
      accuracy: session.accuracy,
      duration: session.duration,
      createdAt: Timestamp.now(),
    })
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'permission-denied') {
      return
    }
    throw error
  }
}

export const getDistractionSlayerLeaderboard = async (): Promise<ArcadeSessionRecord[]> => {
  const localTop = [...readLocal()]
    .filter((item) => item.gameType === 'Distraction Slayer')
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)

  try {
    const q = query(
      collection(db, 'sessions'),
      where('gameType', '==', 'Distraction Slayer'),
      orderBy('score', 'desc'),
      limit(8),
    )
    const snapshot = await getDocs(q)

    const remote = snapshot.docs.map((doc) => {
      const data = doc.data() as {
        userId?: string
        gameType?: string
        score?: number
        accuracy?: number
        duration?: number
        createdAt?: Timestamp
      }

      return {
        id: doc.id,
        userId: String(data.userId ?? 'unknown'),
        gameType: String(data.gameType ?? 'Distraction Slayer'),
        score: Number(data.score ?? 0),
        accuracy: Number(data.accuracy ?? 0),
        duration: Number(data.duration ?? 60),
        createdAt: data.createdAt?.toMillis() ?? Date.now(),
      }
    })

    return remote.length > 0 ? remote : localTop
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'permission-denied') {
      return localTop
    }
    return localTop
  }
}
