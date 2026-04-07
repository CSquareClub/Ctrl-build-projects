import { FirebaseError } from 'firebase/app'
import { type User } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
  type Unsubscribe,
  where,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'

import { db, storage } from '../lib/firebase'

export type Room = {
  id: string
  name: string
  topic: string
  createdBy: string
  isLive: boolean
  startTime: Timestamp | null
  duration: number
}

export type RoomMember = {
  id: string
  name: string
  email: string
  status: 'focusing'
  joinedAt: Timestamp | null
}

export type RoomMessage = {
  id: string
  text: string
  senderId: string
  senderName: string
  messageType: 'text' | 'file'
  fileName?: string
  fileUrl?: string
  fileSize?: number
  createdAt: Timestamp | null
}

const FILE_MESSAGE_PREFIX = '__focusroom_file__:'

const parseEncodedFileMessage = (text: string) => {
  if (!text.startsWith(FILE_MESSAGE_PREFIX)) {
    return null
  }

  try {
    return JSON.parse(decodeURIComponent(text.slice(FILE_MESSAGE_PREFIX.length))) as {
      name?: string
      url?: string
      size?: number
      type?: string
    }
  } catch {
    return null
  }
}

export type CreateRoomInput = {
  name: string
  topic: string
  duration: number
}

const mapRoom = (id: string, data: DocumentData): Room => {
  const fallbackName = data.name ?? data.title ?? 'Untitled Room'
  const fallbackTopic = data.topic ?? data.description ?? 'General Focus'

  return {
    id,
    name: String(fallbackName),
    topic: String(fallbackTopic),
    createdBy: String(data.createdBy ?? 'unknown'),
    isLive: Boolean(data.isLive ?? true),
    startTime: (data.startTime as Timestamp | undefined) ?? null,
    duration: Number(data.duration ?? 45),
  }
}

const mapRoomMember = (id: string, data: DocumentData): RoomMember => ({
  id,
  name: String(data.name ?? 'Member'),
  email: String(data.email ?? ''),
  status: 'focusing',
  joinedAt: (data.joinedAt as Timestamp | undefined) ?? null,
})

const mapRoomMessage = (id: string, data: DocumentData): RoomMessage => {
  const text = String(data.text ?? '')
  const encodedFile = parseEncodedFileMessage(text)

  return {
    id,
    text,
    senderId: String(data.senderId ?? ''),
    senderName: String(data.senderName ?? 'Member'),
    messageType: data.messageType === 'file' || Boolean(encodedFile) ? 'file' : 'text',
    fileName: typeof data.fileName === 'string' ? data.fileName : encodedFile?.name,
    fileUrl: typeof data.fileUrl === 'string' ? data.fileUrl : encodedFile?.url,
    fileSize: typeof data.fileSize === 'number' ? data.fileSize : encodedFile?.size,
    createdAt: (data.createdAt as Timestamp | undefined) ?? null,
  }
}

const getDisplayName = (user: User) => {
  if (user.displayName?.trim()) return user.displayName.trim()
  if (user.email?.trim()) return user.email.split('@')[0]
  return 'Focus Member'
}

const requireAuthenticatedUser = (user: User | null): User => {
  if (!user) {
    throw new Error('You must be signed in to perform this action.')
  }

  return user
}

const handleFirestoreError = (error: unknown, fallback: string): never => {
  if (error instanceof FirebaseError) {
    throw new Error(`${fallback} (${error.code})`)
  }

  if (error instanceof Error) {
    throw error
  }

  throw new Error(fallback)
}

const readFileAsDataUrl = async (file: File): Promise<string> => {
  const result = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Unable to read file locally.'))
    reader.readAsDataURL(file)
  })

  if (!result) {
    throw new Error('Unable to read file locally.')
  }

  return result
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      }),
    ])
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
  }
}

const encodeFileMessage = (file: File, fileUrl: string) =>
  `${FILE_MESSAGE_PREFIX}${encodeURIComponent(JSON.stringify({
    name: file.name,
    size: file.size,
    type: file.type,
    url: fileUrl,
  }))}`

const writeRoomFileMessage = async (
  roomId: string,
  user: User,
  file: File,
  fileUrl: string,
) => {
  const messagesRef = collection(db, 'rooms', roomId, 'messages')
  const encodedText = encodeFileMessage(file, fileUrl)

  try {
    await addDoc(messagesRef, {
      text: encodedText,
      senderId: user.uid,
      senderName: getDisplayName(user),
      messageType: 'file',
      fileName: file.name,
      fileUrl,
      fileSize: file.size,
      createdAt: serverTimestamp(),
    })
  } catch {
    // Keep the encoded file payload even if strict message schemas reject metadata fields.
    await addDoc(messagesRef, {
      text: encodedText,
      senderId: user.uid,
      senderName: getDisplayName(user),
      createdAt: serverTimestamp(),
    })
  }
}

export const createRoom = async (input: CreateRoomInput, user: User | null): Promise<string> => {
  const authenticatedUser = requireAuthenticatedUser(user)

  try {
    const roomsRef = collection(db, 'rooms')
    const roomDoc = await addDoc(roomsRef, {
      name: input.name.trim(),
      topic: input.topic.trim(),
      createdBy: authenticatedUser.uid,
      isLive: true,
      startTime: serverTimestamp(),
      duration: Math.max(15, Math.round(input.duration)),
    })

    await joinRoom(roomDoc.id, authenticatedUser)
    return roomDoc.id
  } catch (error) {
    return handleFirestoreError(error, 'Unable to create room.')
  }
}

export const getRooms = async (): Promise<Room[]> => {
  try {
    const roomsRef = collection(db, 'rooms')
    const roomsQuery = query(roomsRef, where('isLive', '==', true))
    const snapshot = await getDocs(roomsQuery)
    return snapshot.docs.map((roomDoc) => mapRoom(roomDoc.id, roomDoc.data()))
  } catch (error) {
    return handleFirestoreError(error, 'Unable to load live rooms.')
  }
}

export const getRoomById = async (roomId: string): Promise<Room | null> => {
  if (!roomId) return null

  try {
    const roomRef = doc(db, 'rooms', roomId)
    const snapshot = await getDoc(roomRef)

    if (!snapshot.exists()) {
      return null
    }

    return mapRoom(snapshot.id, snapshot.data())
  } catch (error) {
    return handleFirestoreError(error, 'Unable to load room.')
  }
}

export const joinRoom = async (roomId: string, user: User | null): Promise<void> => {
  const authenticatedUser = requireAuthenticatedUser(user)
  if (!roomId) throw new Error('Invalid room id.')

  const room = await getRoomById(roomId)
  if (!room) throw new Error('Room does not exist.')

  try {
    const memberRef = doc(db, 'rooms', roomId, 'members', authenticatedUser.uid)
    await setDoc(memberRef, {
      name: getDisplayName(authenticatedUser),
      email: authenticatedUser.email ?? '',
      status: 'focusing',
      joinedAt: serverTimestamp(),
    }, { merge: true })
  } catch (error) {
    return handleFirestoreError(error, 'Unable to join room.')
  }
}

export const leaveRoom = async (roomId: string, user: User | null): Promise<void> => {
  const authenticatedUser = requireAuthenticatedUser(user)
  if (!roomId) throw new Error('Invalid room id.')

  try {
    const memberRef = doc(db, 'rooms', roomId, 'members', authenticatedUser.uid)
    await deleteDoc(memberRef)
  } catch (error) {
    return handleFirestoreError(error, 'Unable to leave room.')
  }
}

export const sendRoomMessage = async (roomId: string, text: string, user: User | null): Promise<void> => {
  const authenticatedUser = requireAuthenticatedUser(user)
  if (!roomId) throw new Error('Invalid room id.')

  const cleaned = text.trim()
  if (!cleaned) throw new Error('Message cannot be empty.')

  try {
    const messagesRef = collection(db, 'rooms', roomId, 'messages')
    await addDoc(messagesRef, {
      text: cleaned,
      senderId: authenticatedUser.uid,
      senderName: getDisplayName(authenticatedUser),
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    return handleFirestoreError(error, 'Unable to send message.')
  }
}

export const shareRoomFile = async (roomId: string, file: File, user: User | null): Promise<void> => {
  const authenticatedUser = requireAuthenticatedUser(user)
  if (!roomId) throw new Error('Invalid room id.')
  if (!file) throw new Error('No file selected.')

  const maxBytes = 10 * 1024 * 1024
  if (file.size > maxBytes) {
    throw new Error('File must be 10MB or smaller.')
  }

  try {
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `rooms/${roomId}/shared/${Date.now()}-${authenticatedUser.uid}-${sanitizedName}`

    try {
      const storageRef = ref(storage, filePath)
      const uploadResult = await withTimeout(
        uploadBytes(storageRef, file),
        12000,
        'File upload timed out. Falling back to inline sharing.',
      )

      const fileUrl = await getDownloadURL(uploadResult.ref)
      await writeRoomFileMessage(roomId, authenticatedUser, file, fileUrl)
    } catch (uploadError) {
      // If Storage is blocked or quota-limited, keep sharing working by storing the attachment inline.
      if (file.size > 700 * 1024) {
        return handleFirestoreError(uploadError, 'Unable to share file.')
      }

      const fallbackUrl = await readFileAsDataUrl(file)
      await writeRoomFileMessage(roomId, authenticatedUser, file, fallbackUrl)
    }
  } catch (error) {
    return handleFirestoreError(error, 'Unable to share file.')
  }
}

export const listenLiveRooms = (
  onData: (rooms: Room[]) => void,
  onError?: (message: string) => void,
): Unsubscribe => {
  const roomsRef = collection(db, 'rooms')
  const roomsQuery = query(roomsRef, where('isLive', '==', true))

  return onSnapshot(
    roomsQuery,
    (snapshot) => {
      onData(snapshot.docs.map((roomDoc) => mapRoom(roomDoc.id, roomDoc.data())))
    },
    (error) => {
      if (onError) {
        onError(error instanceof FirebaseError ? `Unable to listen to rooms (${error.code})` : 'Unable to listen to rooms.')
      }
    },
  )
}

export const listenRoomMembers = (
  roomId: string,
  onData: (members: RoomMember[]) => void,
  onError?: (message: string) => void,
): Unsubscribe => {
  const membersRef = collection(db, 'rooms', roomId, 'members')

  return onSnapshot(
    membersRef,
    (snapshot) => {
      onData(snapshot.docs.map((memberDoc) => mapRoomMember(memberDoc.id, memberDoc.data())))
    },
    (error) => {
      if (onError) {
        onError(error instanceof FirebaseError ? `Unable to listen to members (${error.code})` : 'Unable to listen to members.')
      }
    },
  )
}

export const listenRoomMessages = (
  roomId: string,
  onData: (messages: RoomMessage[]) => void,
  onError?: (message: string) => void,
): Unsubscribe => {
  const messagesRef = collection(db, 'rooms', roomId, 'messages')
  const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'))

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      onData(snapshot.docs.map((messageDoc) => mapRoomMessage(messageDoc.id, messageDoc.data())))
    },
    (error) => {
      if (onError) {
        onError(error instanceof FirebaseError ? `Unable to listen to chat (${error.code})` : 'Unable to listen to chat.')
      }
    },
  )
}
