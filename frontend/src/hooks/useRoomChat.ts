import { useEffect, useState } from 'react'

import { listenRoomMessages, type RoomMessage } from '../services/rooms'

export function useRoomChat(roomId: string | undefined) {
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!roomId) {
      setMessages([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const unsubscribe = listenRoomMessages(
      roomId,
      (nextMessages) => {
        setMessages(nextMessages)
        setLoading(false)
      },
      (message) => {
        setError(message)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [roomId])

  return { messages, loading, error }
}
