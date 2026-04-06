import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'

import { db } from '../lib/firebase'
import { mockRooms } from '../mock/rooms'

export type Room = {
  id: string
  title: string
  description: string
  activeUsers: number
  createdAt?: Timestamp | null
}

const mapRoom = (id: string, data: DocumentData): Room => ({
  id,
  title: String(data.title ?? 'Untitled Room'),
  description: String(data.description ?? 'No description available.'),
  activeUsers: Number(data.activeUsers ?? 0),
  createdAt: (data.createdAt as Timestamp | undefined) ?? null,
})

const seedDefaultRooms = async () => {
  await Promise.all(
    mockRooms.map((room) =>
      setDoc(
        doc(db, 'rooms', room.id),
        {
          title: room.title,
          description: room.description,
          activeUsers: room.activeUsers,
          createdAt: serverTimestamp(),
        },
        { merge: true },
      ),
    ),
  )
}

export const getRooms = async (): Promise<Room[]> => {
  const roomsRef = collection(db, 'rooms')
  try {
    const orderedQuery = query(roomsRef, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(orderedQuery)

    if (snapshot.empty) {
      try {
        await seedDefaultRooms()
        const seededSnapshot = await getDocs(roomsRef)
        if (seededSnapshot.empty) {
          return mockRooms
        }
        return seededSnapshot.docs.map((roomDoc) => mapRoom(roomDoc.id, roomDoc.data()))
      } catch (seedError) {
        if (seedError instanceof FirebaseError && seedError.code === 'permission-denied') {
          return mockRooms
        }
        throw seedError
      }
    }

    return snapshot.docs.map((roomDoc) => mapRoom(roomDoc.id, roomDoc.data()))
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'permission-denied') {
      return mockRooms
    }

    // Fallback: if createdAt is missing on some documents or query constraints fail,
    // fetch without ordering so the UI still renders available rooms.
    try {
      const snapshot = await getDocs(roomsRef)
      return snapshot.docs.map((roomDoc) => mapRoom(roomDoc.id, roomDoc.data()))
    } catch (fallbackError) {
      if (fallbackError instanceof FirebaseError && fallbackError.code === 'permission-denied') {
        return mockRooms
      }
      throw fallbackError
    }
  }
}

export const getRoomById = async (roomId: string): Promise<Room | null> => {
  const roomRef = doc(db, 'rooms', roomId)
  try {
    const snapshot = await getDoc(roomRef)

    if (!snapshot.exists()) {
      return null
    }

    return mapRoom(snapshot.id, snapshot.data())
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'permission-denied') {
      return mockRooms.find((room) => room.id === roomId) ?? null
    }
    throw error
  }
}
