import { useEffect, useState } from 'react'
import { FirebaseError } from 'firebase/app'
import { collection, onSnapshot, type DocumentData } from 'firebase/firestore'

import { db } from '../../../lib/firebase'
import type { LeaderboardUser } from '../types'

const mapLeaderboardUser = (id: string, data: DocumentData): LeaderboardUser => ({
  id,
  name: String(data.name ?? data.displayName ?? 'Anonymous'),
  email: String(data.email ?? ''),
  totalFocusTime: Number(data.totalFocusTime ?? 0),
  sessions: Number(data.sessions ?? 0),
  streak: Number(data.streak ?? 0),
})

export function useLeaderboard() {
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const usersRef = collection(db, 'users')
    const unsubscribe = onSnapshot(
      usersRef,
      (snapshot) => {
        const nextUsers = snapshot.docs
          .map((doc) => mapLeaderboardUser(doc.id, doc.data()))
          .sort((a, b) => b.totalFocusTime - a.totalFocusTime)

        setUsers(nextUsers)
        setLoading(false)
      },
      (err) => {
        if (err instanceof FirebaseError) {
          setError(`Unable to load leaderboard (${err.code}).`)
        } else {
          setError('Unable to load leaderboard.')
        }
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  return { users, loading, error }
}
