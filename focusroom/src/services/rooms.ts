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
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
  type Unsubscribe,
  where,
} from 'firebase/firestore'

import { db } from '../lib/firebase'

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
