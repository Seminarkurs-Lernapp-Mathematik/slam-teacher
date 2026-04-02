import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

const mockCreateTeacher = vi.fn()
const mockCreateClass = vi.fn()
const mockInviteStudent = vi.fn()

vi.mock('../api/mutations', () => ({
  useCreateTeacher: vi.fn(() => ({
    mutateAsync: mockCreateTeacher,
    isPending: false,
  })),
  useCreateClass: vi.fn(() => ({
    mutateAsync: mockCreateClass,
    isPending: false,
  })),
  useInviteStudent: vi.fn(() => ({
    mutateAsync: mockInviteStudent,
    isPending: false,
  })),
}))

vi.mock('../store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({
      setSelectedClassId: vi.fn(),
      setTheme: vi.fn(),
    })
  ),
}))

vi.mock('../firebase', () => ({
  auth: {
    currentUser: {
      uid: 'teacher-uid-1',
      email: 'mueller@mvl-gym.de',
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    },
  },
}))

import { Onboarding } from './Onboarding'

describe('Onboarding wizard', () => {
  beforeEach(() => {
    mockCreateTeacher.mockClear()
    mockCreateClass.mockClear()
    mockInviteStudent.mockClear()
    mockCreateTeacher.mockResolvedValue({
      uid: 'teacher-1',
      displayName: 'Frau Müller',
      classIds: [],
    })
    mockCreateClass.mockResolvedValue({
      id: 'cls-1',
      name: '11a',
      gridConfig: { rows: 4, cols: 5 },
    })
    mockInviteStudent.mockResolvedValue({ uid: 'stu-1', email: 'anna@mvl-gym.de' })
  })

  it('shows step 1 Willkommen on mount', () => {
    render(<Onboarding />)
    expect(screen.getByText('Willkommen')).toBeInTheDocument()
    expect(screen.getByLabelText('Anzeigename')).toBeInTheDocument()
  })

  it('advances to step 2 after entering display name', async () => {
    render(<Onboarding />)
    await userEvent.type(screen.getByLabelText('Anzeigename'), 'Frau Müller')
    await userEvent.click(screen.getByRole('button', { name: /weiter/i }))
    expect(screen.getByText('Klasse erstellen')).toBeInTheDocument()
  })

  it('step 2 shows class name and grid inputs', async () => {
    render(<Onboarding />)
    await userEvent.type(screen.getByLabelText('Anzeigename'), 'Frau Müller')
    await userEvent.click(screen.getByRole('button', { name: /weiter/i }))
    expect(screen.getByLabelText('Klassenname')).toBeInTheDocument()
    expect(screen.getByLabelText('Reihen')).toBeInTheDocument()
    expect(screen.getByLabelText('Spalten')).toBeInTheDocument()
  })

  it('calls createTeacher and createClass on finish', async () => {
    render(<Onboarding />)
    await userEvent.type(screen.getByLabelText('Anzeigename'), 'Frau Müller')
    await userEvent.click(screen.getByRole('button', { name: /weiter/i }))
    await userEvent.type(screen.getByLabelText('Klassenname'), '11a')
    await userEvent.click(screen.getByRole('button', { name: /weiter/i }))
    // Step 3 — skip students and click Fertig
    await userEvent.click(screen.getByRole('button', { name: /fertig/i }))
    await waitFor(() => expect(mockCreateTeacher).toHaveBeenCalledOnce())
    await waitFor(() =>
      expect(mockCreateClass).toHaveBeenCalledWith(
        expect.objectContaining({ name: '11a' })
      )
    )
  })
})
