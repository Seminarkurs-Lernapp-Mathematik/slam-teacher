import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { ApiError } from './api/client'

const { mockUseTeacher } = vi.hoisted(() => ({
  mockUseTeacher: vi.fn(),
}))

vi.mock('./api/hooks', () => ({
  useTeacher: mockUseTeacher,
  useClasses: vi.fn().mockReturnValue({ data: [] }),
  useStudents: vi.fn().mockReturnValue({ data: [], isLoading: false }),
}))

vi.mock('./api/mutations', () => ({
  useUpdateClass: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}))

vi.mock('./pages/Login', () => ({
  Login: () => <div>Login</div>,
}))

vi.mock('./pages/Onboarding', () => ({
  Onboarding: () => <div>Onboarding</div>,
}))

vi.mock('./pages/Klassenraum', () => ({
  Klassenraum: () => <div>Klassenraum</div>,
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
  beforeEach(() => {
    mockUseTeacher.mockReturnValue({
      data: {
        uid: 'teacher-uid-1',
        displayName: 'Frau MÃ¼ller',
        email: 'mueller@mvl-gym.de',
        schoolId: 'mvl',
        classIds: ['class-1'],
        theme: 'dark',
        createdAt: '2026-01-01T00:00:00Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    })
  })

  it('renders Klassenraum stub at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getAllByText('Klassenraum').length).toBeGreaterThan(0)
  })

  it('renders onboarding when teacher profile is missing', () => {
    mockUseTeacher.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError('Teacher profile not found', 404),
    })

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    expect(screen.getByText('Onboarding')).toBeInTheDocument()
  })
})
