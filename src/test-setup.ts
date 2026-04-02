import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('./firebase', () => ({
  auth: {
    currentUser: {
      uid: 'teacher-uid-1',
      email: 'mueller@mvl-gym.de',
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    },
    onAuthStateChanged: vi.fn((callback: (user: object | null) => void) => {
      callback({ uid: 'teacher-uid-1', email: 'mueller@mvl-gym.de' })
      return vi.fn() // unsubscribe
    }),
  },
}))
