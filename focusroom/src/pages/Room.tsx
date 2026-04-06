import { Clock3, FileUp, LogOut, Send, Users } from 'lucide-react'
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { useRoomChat } from '../hooks/useRoomChat'
import { useRoomMembers } from '../hooks/useRoomMembers'
import { getRoomById, joinRoom, leaveRoom, sendRoomMessage, shareRoomFile } from '../services/rooms'
import { saveSession } from '../services/sessions'

const formatElapsed = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const extractFirstUrl = (value: string) => {
  const match = value.match(/https?:\/\/\S+/)
  return match ? match[0] : null
}

export function RoomPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { members, loading: membersLoading, error: membersError } = useRoomMembers(id)
  const { messages, loading: messagesLoading, error: messagesError } = useRoomChat(id)

  const [roomTitle, setRoomTitle] = useState('Focus Room')
  const [roomTopic, setRoomTopic] = useState('')
  const [loadingRoom, setLoadingRoom] = useState(true)
  const [roomError, setRoomError] = useState<string | null>(null)
  const [joinReady, setJoinReady] = useState(false)
  const [startTime, setStartTime] = useState<Date>(() => new Date())
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [messageSending, setMessageSending] = useState(false)
  const [fileSharing, setFileSharing] = useState(false)
  const [messageError, setMessageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const tick = window.setInterval(() => {
      const now = Date.now()
      const diffSeconds = Math.max(0, Math.floor((now - startTime.getTime()) / 1000))
      setElapsedSeconds(diffSeconds)
    }, 1000)

    return () => window.clearInterval(tick)
  }, [startTime])

  useEffect(() => {
    let alive = true

    const run = async () => {
      if (!id) {
        setRoomError('Invalid room id.')
        setLoadingRoom(false)
        return
      }

      if (!user) {
        setRoomError('Please login to join this room.')
        setLoadingRoom(false)
        return
      }

      try {
        const room = await getRoomById(id)
        if (!alive) return

        if (!room) {
          setRoomError('Room not found. Please check the room link.')
          setLoadingRoom(false)
          return
        }

        setRoomTitle(room.name)
        setRoomTopic(room.topic)

        await joinRoom(id, user)
        if (!alive) return

        setStartTime(new Date())
        setJoinReady(true)
      } catch (error) {
        if (!alive) return
        setRoomError(error instanceof Error ? error.message : 'Unable to join room.')
      } finally {
        if (alive) {
          setLoadingRoom(false)
        }
      }
    }

    void run()

    return () => {
      alive = false
    }
  }, [id, user])

  const timerText = useMemo(() => formatElapsed(elapsedSeconds), [elapsedSeconds])

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!id || !user) {
      setMessageError('Please login to send a message.')
      return
    }

    if (!messageText.trim()) {
      return
    }

    setMessageSending(true)
    setMessageError(null)
    try {
      await sendRoomMessage(id, messageText, user)
      setMessageText('')
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : 'Unable to send message.')
    } finally {
      setMessageSending(false)
    }
  }

  const handleLeaveRoom = async () => {
    if (!user || !id) {
      navigate('/dashboard', { replace: true })
      return
    }

    setSubmitting(true)
    const endTime = new Date()
    const duration = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)))

    try {
      try {
        await leaveRoom(id, user)
      } catch {
        // If room member cleanup fails, still continue to persist session history.
      }

      await saveSession({
        userId: user.uid,
        roomId: id,
        roomTitle: roomTitle || `Room ${id}`,
        roomTopic,
        memberCount: members.length,
        startTime,
        endTime,
        duration,
      })
      navigate('/records', { replace: true })
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Unable to save session history. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePickFile = () => {
    if (!fileSharing) {
      fileInputRef.current?.click()
    }
  }

  const handleShareFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    event.target.value = ''

    if (!selectedFile) {
      return
    }

    if (!id || !user) {
      setMessageError('Please login to share a file.')
      return
    }

    setFileSharing(true)
    setMessageError(null)
    try {
      await shareRoomFile(id, selectedFile, user)
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : 'Unable to share file.')
    } finally {
      setFileSharing(false)
    }
  }

  if (loadingRoom) {
    return (
      <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
        <Sidebar />
        <main className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:ml-72">
          <p className="text-sm text-[var(--muted)]">Joining room...</p>
        </main>
      </div>
    )
  }

  if (roomError) {
    return (
      <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
        <Sidebar />
        <main className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:ml-72">
          <section className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
            <h1 className="text-2xl font-semibold">Unable to open room</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{roomError}</p>
            <button
              type="button"
              onClick={() => navigate('/smart-room')}
              className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 text-sm text-[var(--text)]"
            >
              Back to Live Rooms
            </button>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />

      <main className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:ml-72">
        <section className="w-full max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Live Session</p>
          <h1 className="mt-3 font-display text-4xl font-semibold">{roomTitle}</h1>
          {roomTopic ? <p className="mt-2 text-sm text-[var(--muted)]">Topic: {roomTopic}</p> : null}

          <div className="mx-auto mt-6 w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 text-left">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
              <Users className="h-4 w-4" />
              Members ({members.length})
            </p>

            {membersLoading ? <p className="mt-2 text-xs text-[var(--muted)]">Loading members...</p> : null}
            {membersError ? <p className="mt-2 text-xs text-[var(--muted)]">{membersError}</p> : null}

            {!membersLoading && members.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--muted)]">No members in this room yet.</p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm text-[var(--text)]">
                {members.map((member) => (
                  <li key={member.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5">
                    <span>{member.name}</span>
                    <span className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">{member.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mx-auto mt-8 w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-8">
            <p className="mb-3 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
              <Clock3 className="h-4 w-4" />
              Focus Timer
            </p>
            <p className="font-display text-7xl font-bold text-[var(--text)]">{timerText}</p>
          </div>

          <div className="mx-auto mt-6 w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 text-left">
            <p className="text-sm font-semibold text-[var(--text)]">Room Chat</p>

            {messagesLoading ? <p className="mt-2 text-xs text-[var(--muted)]">Loading messages...</p> : null}
            {messagesError ? <p className="mt-2 text-xs text-[var(--muted)]">{messagesError}</p> : null}

            <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-2.5">
              {!messagesLoading && messages.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">No messages yet. Start the conversation.</p>
              ) : (
                messages.map((message) => {
                  const own = user?.uid === message.senderId
                  const fallbackUrl = extractFirstUrl(message.text)
                  return (
                    <article
                      key={message.id}
                      className={`rounded-lg border px-2.5 py-2 text-sm ${
                        own
                          ? 'ml-8 border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text)]'
                          : 'mr-8 border-[var(--border)] bg-[var(--card)] text-[var(--text)]'
                      }`}
                    >
                      <p className="text-xs text-[var(--muted)]">{own ? 'You' : message.senderName}</p>
                      {message.messageType === 'file' && message.fileUrl ? (
                        <div className="mt-1 space-y-1">
                          <p className="text-xs text-[var(--muted)]">Shared a file</p>
                          <a
                            href={message.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)] hover:opacity-90"
                          >
                            {message.fileName ?? 'Download file'}
                          </a>
                          {typeof message.fileSize === 'number' ? (
                            <p className="text-[11px] text-[var(--muted)]">{(message.fileSize / 1024).toFixed(1)} KB</p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-0.5 space-y-1">
                          <p>{message.text}</p>
                          {fallbackUrl ? (
                            <a
                              href={fallbackUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)] hover:opacity-90"
                            >
                              Open shared file
                            </a>
                          ) : null}
                        </div>
                      )}
                    </article>
                  )
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Type a message"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--text)]"
              />
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleShareFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={handlePickFile}
                disabled={fileSharing}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] transition-opacity hover:opacity-90 disabled:opacity-70"
              >
                <FileUp className="h-4 w-4" />
                {fileSharing ? 'Sharing' : 'File'}
              </button>
              <button
                type="submit"
                disabled={messageSending}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] transition-opacity hover:opacity-90 disabled:opacity-70"
              >
                <Send className="h-4 w-4" />
                {messageSending ? 'Sending' : 'Send'}
              </button>
            </form>

            {messageError ? <p className="mt-2 text-xs text-[var(--muted)]">{messageError}</p> : null}
          </div>

          <button
            type="button"
            onClick={handleLeaveRoom}
            disabled={submitting || !joinReady}
            className="mt-8 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-5 py-2.5 text-sm font-medium text-[var(--text)] transition-all duration-200 hover:opacity-90 disabled:opacity-70"
          >
            <LogOut className="h-4 w-4" />
            {submitting ? 'Leaving...' : 'Leave Room'}
          </button>
        </section>
      </main>
    </div>
  )
}
