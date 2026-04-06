import type { Room } from '../services/rooms'

export const mockRooms: Room[] = [
  {
    id: 'mock-room-neuro-lab',
    title: 'Neuro Lab Sprint',
    description: 'Flashcard-first deep work room for neuroscience and memory drills.',
    activeUsers: 14,
    createdAt: null,
  },
  {
    id: 'mock-room-clinical-core',
    title: 'Clinical Core 50',
    description: 'Structured 50-minute blocks for exam prep and case recall.',
    activeUsers: 21,
    createdAt: null,
  },
  {
    id: 'mock-room-quantum-grid',
    title: 'Quantum Grid',
    description: 'Physics and math challenge room with live accountability.',
    activeUsers: 9,
    createdAt: null,
  },
]