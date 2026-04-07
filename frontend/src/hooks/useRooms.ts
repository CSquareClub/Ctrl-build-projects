import { useEffect, useState } from 'react'

import { listenLiveRooms, type Room } from '../services/rooms'

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = listenLiveRooms((nextRooms) => {
      setRooms(nextRooms)
      setLoading(false)
    }, (message) => {
      setError(message)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  return { rooms, loading, error }
}
