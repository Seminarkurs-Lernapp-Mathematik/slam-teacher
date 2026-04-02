import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

vi.mock('./api/hooks', () => ({
  useTeacher: vi.fn().mockReturnValue({
    data: {
      uid: 'teacher-uid-1',
      displayName: 'Frau Müller',
      email: 'mueller@mvl-gym.de',
      schoolId: 'mvl',
      classIds: ['class-1'],
      theme: 'dark',
      createdAt: '2026-01-01T00:00:00Z',
    },
    isLoading: false,
    isError: false,
  }),
  useClasses: vi.fn().mockReturnValue({ data: [] }),
}))

vi.mock('./store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({
      selectedClassId: 'class-1',
      setSelectedClassId: vi.fn(),
      setTheme: vi.fn(),
    })
  ),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    QueryClient: class {},
  }
})

import { App } from './App'

describe('App routing', () => {
  it('renders Klassenraum stub at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getAllByText('Klassenraum').length).toBeGreaterThan(0)
  })
})
