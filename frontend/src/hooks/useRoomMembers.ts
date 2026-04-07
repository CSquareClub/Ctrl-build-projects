import { useEffect, useState } from 'react'

import { listenRoomMembers, type RoomMember } from '../services/rooms'

export function useRoomMembers(roomId: string | undefined) {
  const [members, setMembers] = useState<RoomMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!roomId) {
      setMembers([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = listenRoomMembers(roomId, (nextMembers) => {
      setMembers(nextMembers)
      setLoading(false)
    }, (message) => {
      setError(message)
      setLoading(false)
    })

    return unsubscribe
  }, [roomId])

  return { members, loading, error }
}
